const db = require('../config/database');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/encrypt');

function getUserApplications(userId, status) {
  let where = 'WHERE pa.user_id = ?';
  const params = [userId];
  if (status && status !== 'all') {
    where += ' AND pa.status = ?';
    params.push(status);
  }

  const items = db.prepare(`
    SELECT pa.*, t.title AS template_title, t.start_date, t.end_date, t.finalized
    FROM parking_applications pa
    JOIN application_templates t ON t.id = pa.template_id
    ${where}
    ORDER BY pa.created_at DESC
  `).all(...params);

  // Before template finalized, hide real status from users
  for (const item of items) {
    if (!item.finalized && item.status !== 'draft') {
      item.status = 'submitted';
    }
    delete item.finalized;
  }

  return items;
}

function getById(id) {
  const app = db.prepare(`
    SELECT pa.*, t.title AS template_title, t.start_date, t.end_date, t.allow_modify, t.status AS template_status, t.finalized
    FROM parking_applications pa
    JOIN application_templates t ON t.id = pa.template_id
    WHERE pa.id = ?
  `).get(id);

  if (!app) throw new NotFoundError('신청을 찾을 수 없습니다.');

  // Before template finalized, hide real status from users
  if (!app.finalized && app.status !== 'draft') {
    app.status = 'submitted';
  }
  delete app.finalized;

  app.answers = db.prepare(`
    SELECT aa.*, q.question_text, q.input_type, q.is_required, q.sort_order,
           o.option_text, o.score AS option_score
    FROM application_answers aa
    JOIN application_questions q ON q.id = aa.question_id
    LEFT JOIN question_options o ON o.id = aa.option_id
    WHERE aa.application_id = ?
    ORDER BY q.sort_order
  `).all(id);

  return app;
}

function create(userId, templateId) {
  const template = db.prepare('SELECT id, end_date, status FROM application_templates WHERE id = ?').get(templateId);
  if (!template) throw new NotFoundError('템플릿을 찾을 수 없습니다.');
  if (template.status !== 'published') {
    throw new AppError('FORBIDDEN', '공개된 템플릿만 신청할 수 있습니다.', 403);
  }

  const existing = db.prepare(
    "SELECT id, status FROM parking_applications WHERE user_id = ? AND template_id = ? AND status IN ('draft', 'submitted')"
  ).get(userId, templateId);
  if (existing) {
    const msg = existing.status === 'draft' ? '이미 임시저장된 신청이 있습니다.' : '이미 제출된 신청이 있습니다.';
    throw new AppError('CONFLICT', msg, 409);
  }

  const result = db.prepare(`
    INSERT INTO parking_applications (user_id, template_id, total_score, status)
    VALUES (?, ?, 0, 'draft')
  `).run(userId, templateId);

  logger.info(`Application created: id=${result.lastInsertRowid}, userId=${userId}, templateId=${templateId}`);
  return { id: result.lastInsertRowid };
}

function update(id, userId, { action, answers, consent_agreed }) {
  const app = db.prepare(`
    SELECT pa.*, t.end_date, t.allow_modify, t.status AS template_status
    FROM parking_applications pa
    JOIN application_templates t ON t.id = pa.template_id
    WHERE pa.id = ?
  `).get(id);

  if (!app) throw new NotFoundError('신청을 찾을 수 없습니다.');
  if (app.user_id !== userId) throw new ForbiddenError('본인의 신청만 수정할 수 있습니다.');

  if (app.template_status !== 'published') {
    throw new AppError('FORBIDDEN', '마감된 템플릿입니다.', 403);
  }

  const now = new Date().toISOString().split('T')[0];
  if (now > app.end_date) {
    throw new AppError('FORBIDDEN', '신청 마감일이 지났습니다.', 403);
  }

  if (app.status === 'submitted' && !app.allow_modify) {
    throw new AppError('FORBIDDEN', '제출 후 수정이 불가능한 템플릿입니다.', 403);
  }
  if (app.status === 'approved' || app.status === 'rejected') {
    throw new AppError('FORBIDDEN', '이미 처리된 신청입니다.', 403);
  }

  const isSubmit = action === 'submit';

  if (isSubmit && consent_agreed === null) {
    throw new AppError('VALIDATION_ERROR', '동의 확인 항목에 응답해 주세요.', 400);
  }

  const delAnswers = db.prepare('DELETE FROM application_answers WHERE application_id = ?');
  const insAnswer = db.prepare(`
    INSERT INTO application_answers (application_id, question_id, option_id, answer_text)
    VALUES (?, ?, ?, ?)
  `);

  let totalScore = 0;

  const transaction = db.transaction(() => {
    delAnswers.run(id);

    for (const a of answers) {
      const question = db.prepare('SELECT is_required FROM application_questions WHERE id = ?').get(a.question_id);
      if (isSubmit && question?.is_required && !a.option_id && !a.answer_text) {
        throw new AppError('VALIDATION_ERROR', `필수 질문에 답변해주세요. (question_id=${a.question_id})`, 400);
      }

      insAnswer.run(id, a.question_id, a.option_id || null, a.answer_text || null);

      if (a.option_id && isSubmit) {
        const opt = db.prepare('SELECT score FROM question_options WHERE id = ?').get(a.option_id);
        if (opt) totalScore += opt.score;
      } else if (a.answer_text && isSubmit) {
        const q = db.prepare('SELECT score FROM application_questions WHERE id = ?').get(a.question_id);
        if (q && q.score > 0) totalScore += q.score;
      }
    }

    if (isSubmit) {
      db.prepare(`
        UPDATE parking_applications SET total_score = ?, status = 'submitted', consent_agreed = ?, submitted_at = datetime('now','localtime'), updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(totalScore, consent_agreed ? 1 : 0, id);
    } else if (consent_agreed !== undefined) {
      db.prepare(`
        UPDATE parking_applications SET total_score = 0, status = 'draft', consent_agreed = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(consent_agreed ? 1 : 0, id);
    } else {
      db.prepare(`
        UPDATE parking_applications SET total_score = 0, status = 'draft', updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(id);
    }
  });

  transaction();
  logger.info(`Application updated: id=${id}, action=${action || 'draft'}, score=${isSubmit ? totalScore : 0}`);
  return { id, status: isSubmit ? 'submitted' : 'draft', total_score: isSubmit ? totalScore : 0 };
}

function getAdminList({ template_id, status, search, sort_by, sort_order, page, limit }) {
  let where = 'WHERE pa.status != ?';
  const params = ['draft'];

  if (template_id) { where += ' AND pa.template_id = ?'; params.push(template_id); }
  if (status && status !== 'all') { where += ' AND pa.status = ?'; params.push(status); }
  if (search) { where += ' AND u.name LIKE ?'; params.push(`%${search}%`); }

  const validSort = ['total_score', 'name', 'created_at', 'submitted_at', 'position', 'join_date', 'special_reason'];
  const sortCol = validSort.includes(sort_by) ? sort_by : 'total_score';
  const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`
    SELECT COUNT(*) as cnt FROM parking_applications pa
    JOIN users u ON u.id = pa.user_id
    ${where}
  `).get(...params).cnt;

  const offset = (page - 1) * limit;
  const items = db.prepare(`
    SELECT pa.id, pa.user_id, u.name, u.phone, u.email, u.car_number, pa.template_id,
           t.title AS template_title, pa.total_score, pa.status, pa.submitted_at,
           pa.admin_memo, pa.created_at,
           MAX(CASE WHEN aq.sort_order = 3 THEN o.option_text END) AS position,
           MAX(CASE WHEN aq.sort_order = 4 THEN aa.answer_text END) AS join_date,
           CASE WHEN MAX(CASE WHEN aq.sort_order = 9 THEN 1 ELSE 0 END) = 1 THEN '있음' ELSE '없음' END AS special_reason,
           MAX(CASE WHEN aq.sort_order = 9 THEN aa.answer_text END) AS special_reason_text,
           CASE WHEN w.id IS NOT NULL THEN 1 ELSE 0 END AS is_whitelisted
    FROM parking_applications pa
    JOIN users u ON u.id = pa.user_id
    JOIN application_templates t ON t.id = pa.template_id
    LEFT JOIN whitelist w ON w.car_number_hash = u.car_number_hash
    LEFT JOIN application_answers aa ON aa.application_id = pa.id
    LEFT JOIN application_questions aq ON aq.id = aa.question_id AND aq.template_id = pa.template_id
    LEFT JOIN question_options o ON o.id = aa.option_id
    ${where}
    GROUP BY pa.id
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  for (const item of items) {
    item.phone = decrypt(item.phone);
    item.car_number = decrypt(item.car_number);
  }

  return { total, page, limit, items };
}

function approve(id, adminId, approvedCount) {
  const app = db.prepare(`
    SELECT pa.*, t.title AS template_title
    FROM parking_applications pa
    JOIN application_templates t ON t.id = pa.template_id
    WHERE pa.id = ?
  `).get(id);

  if (!app) throw new NotFoundError('신청을 찾을 수 없습니다.');
  if (app.status !== 'submitted') {
    throw new AppError('CONFLICT', '제출된 신청만 승인할 수 있습니다.', 409);
  }

  db.prepare(`
    UPDATE parking_applications SET status = 'approved', approved_at = datetime('now','localtime'), approved_by = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(adminId, id);

  logger.info(`Application approved: id=${id}, by=${adminId}`);
  return { id, status: 'approved' };
}

function reject(id, adminId, reason) {
  const app = db.prepare('SELECT id, status FROM parking_applications WHERE id = ?').get(id);
  if (!app) throw new NotFoundError('신청을 찾을 수 없습니다.');
  if (app.status !== 'submitted') {
    throw new AppError('CONFLICT', '제출된 신청만 반려할 수 있습니다.', 409);
  }

  db.prepare(`
    UPDATE parking_applications SET status = 'rejected', admin_memo = ?, approved_at = datetime('now','localtime'), approved_by = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(reason, adminId, id);

  logger.info(`Application rejected: id=${id}, by=${adminId}, reason=${reason}`);
  return { id, status: 'rejected' };
}

function getExportList({ template_id }) {
  const items = db.prepare(`
    SELECT pa.id, pa.user_id, u.name, u.phone, u.email, u.car_number, pa.template_id,
           t.title AS template_title, pa.total_score, pa.status, pa.submitted_at,
           pa.admin_memo, pa.created_at,
           CASE WHEN w.id IS NOT NULL THEN 1 ELSE 0 END AS is_whitelisted
    FROM parking_applications pa
    JOIN users u ON u.id = pa.user_id
    JOIN application_templates t ON t.id = pa.template_id
    LEFT JOIN whitelist w ON w.car_number_hash = u.car_number_hash
    WHERE pa.status != 'draft' AND pa.template_id = ?
    ORDER BY pa.total_score DESC
  `).all(template_id);

  for (const item of items) {
    item.phone = decrypt(item.phone);
    item.car_number = decrypt(item.car_number);
  }
  return items;
}

module.exports = { getUserApplications, getById, create, update, getAdminList, approve, reject, getExportList };

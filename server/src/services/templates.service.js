const db = require('../config/database');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function list({ status }) {
  let where = '';
  const params = [];
  if (status && status !== 'all') {
    where = 'WHERE t.status = ?';
    params.push(status);
  }

  const items = db.prepare(`
    SELECT t.id, t.title, t.status, t.start_date, t.end_date, t.created_by,
           u.name AS author, t.created_at
    FROM application_templates t
    JOIN users u ON u.id = t.created_by
    ${where}
    ORDER BY t.created_at DESC
  `).all(...params);

  return items;
}

function getById(id) {
  const template = db.prepare(`
    SELECT t.*, u.name AS author
    FROM application_templates t
    JOIN users u ON u.id = t.created_by
    WHERE t.id = ?
  `).get(id);

  if (!template) throw new NotFoundError('템플릿을 찾을 수 없습니다.');

  const questions = db.prepare(`
    SELECT q.*, GROUP_CONCAT(
      json_object('id', o.id, 'option_text', o.option_text, 'score', o.score, 'sort_order', o.sort_order)
    ) AS options_json
    FROM application_questions q
    LEFT JOIN question_options o ON o.question_id = q.id
    WHERE q.template_id = ?
    GROUP BY q.id
    ORDER BY q.sort_order
  `).all(id);

  template.questions = questions.map(q => ({
    ...q,
    options: q.options_json ? JSON.parse(`[${q.options_json}]`).filter(o => o.id !== null) : [],
    options_json: undefined,
  }));

  template.attachments = db.prepare(`
    SELECT id, original_name, mime_type, size, created_at
    FROM template_attachments
    WHERE template_id = ?
    ORDER BY created_at ASC
  `).all(id);

  return template;
}

function create({ title, description, start_date, end_date, allow_modify }, userId) {
  const result = db.prepare(`
    INSERT INTO application_templates (title, description, start_date, end_date, allow_modify, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, description || null, start_date, end_date, allow_modify ? 1 : 0, userId);

  logger.info(`Template created: id=${result.lastInsertRowid}, by=${userId}`);
  return { id: result.lastInsertRowid };
}

function update(id, { title, description, start_date, end_date, allow_modify, status }, userId) {
  const template = db.prepare('SELECT id FROM application_templates WHERE id = ?').get(id);
  if (!template) throw new NotFoundError('템플릿을 찾을 수 없습니다.');

  const sets = [];
  const params = [];

  if (title !== undefined) { sets.push('title = ?'); params.push(title); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (start_date !== undefined) { sets.push('start_date = ?'); params.push(start_date); }
  if (end_date !== undefined) { sets.push('end_date = ?'); params.push(end_date); }
  if (allow_modify !== undefined) { sets.push('allow_modify = ?'); params.push(allow_modify ? 1 : 0); }
  if (status !== undefined) {
    if (!['draft', 'published', 'closed'].includes(status)) {
      throw new AppError('VALIDATION_ERROR', '올바르지 않은 상태값입니다.', 400);
    }
    sets.push('status = ?');
    params.push(status);
  }

  if (sets.length === 0) return { id };

  sets.push("updated_at = datetime('now','localtime')");
  params.push(id);

  db.prepare(`UPDATE application_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  logger.info(`Template updated: id=${id}, by=${userId}`);
  return { id };
}

function remove(id) {
  const template = db.prepare('SELECT id FROM application_templates WHERE id = ?').get(id);
  if (!template) throw new NotFoundError('템플릿을 찾을 수 없습니다.');
  db.prepare('DELETE FROM application_templates WHERE id = ?').run(id);
  logger.info(`Template deleted: id=${id}`);
}

function getQuestions(templateId) {
  const template = db.prepare('SELECT id FROM application_templates WHERE id = ?').get(templateId);
  if (!template) throw new NotFoundError('템플릿을 찾을 수 없습니다.');

  return db.prepare(`
    SELECT q.*, o.id AS option_id, o.option_text, o.score AS option_score, o.sort_order AS option_sort
    FROM application_questions q
    LEFT JOIN question_options o ON o.question_id = q.id
    WHERE q.template_id = ?
    ORDER BY q.sort_order, o.sort_order
  `).all(templateId);
}

function saveQuestions(templateId, questions, userId) {
  const template = db.prepare('SELECT id FROM application_templates WHERE id = ?').get(templateId);
  if (!template) throw new NotFoundError('템플릿을 찾을 수 없습니다.');

  const delQuestions = db.prepare('DELETE FROM application_questions WHERE template_id = ?');
  const insQuestion = db.prepare(`
    INSERT INTO application_questions (template_id, question_text, input_type, is_required, score, sort_order, placeholder)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insOption = db.prepare(`
    INSERT INTO question_options (question_id, option_text, score, sort_order) VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    delQuestions.run(templateId);
    for (const q of questions) {
      const qResult = insQuestion.run(
        templateId, q.question_text, q.input_type, q.is_required ? 1 : 0, q.score || 0, q.sort_order || 0, q.placeholder || null
      );
      if (q.options && Array.isArray(q.options)) {
        for (const o of q.options) {
          insOption.run(qResult.lastInsertRowid, o.option_text, o.score || 0, o.sort_order || 0);
        }
      }
    }
  });

  transaction();
  logger.info(`Questions saved for template: id=${templateId}, count=${questions.length}, by=${userId}`);
  return { template_id: templateId, count: questions.length };
}

function updateQuestion(id, { question_text, input_type, is_required, score, sort_order, placeholder }) {
  const question = db.prepare('SELECT id FROM application_questions WHERE id = ?').get(id);
  if (!question) throw new NotFoundError('질문을 찾을 수 없습니다.');

  const sets = [];
  const params = [];
  if (question_text !== undefined) { sets.push('question_text = ?'); params.push(question_text); }
  if (input_type !== undefined) { sets.push('input_type = ?'); params.push(input_type); }
  if (is_required !== undefined) { sets.push('is_required = ?'); params.push(is_required ? 1 : 0); }
  if (score !== undefined) { sets.push('score = ?'); params.push(score); }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order); }
  if (placeholder !== undefined) { sets.push('placeholder = ?'); params.push(placeholder); }

  if (sets.length === 0) return { id };
  params.push(id);

  db.prepare(`UPDATE application_questions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return { id };
}

function deleteQuestion(id) {
  const question = db.prepare('SELECT id FROM application_questions WHERE id = ?').get(id);
  if (!question) throw new NotFoundError('질문을 찾을 수 없습니다.');
  db.prepare('DELETE FROM application_questions WHERE id = ?').run(id);
}

module.exports = { list, getById, create, update, remove, getQuestions, saveQuestions, updateQuestion, deleteQuestion };

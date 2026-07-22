const db = require('../config/database');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

function get(userId) {
  const user = db.prepare('SELECT id, name, phone, email, role, status, mypage_answers FROM users WHERE id = ? AND deleted_at IS NULL').get(userId);
  if (!user) throw new NotFoundError('사용자를 찾을 수 없습니다.');

  let mypageAnswers = {};
  try { mypageAnswers = user.mypage_answers ? JSON.parse(user.mypage_answers) : {}; } catch (e) {}
  delete user.mypage_answers;

  const answers = db.prepare(`
    SELECT aa.*, q.question_text, q.input_type, q.sort_order
    FROM application_answers aa
    JOIN parking_applications pa ON pa.id = aa.application_id
    JOIN application_questions q ON q.id = aa.question_id
    WHERE pa.user_id = ? AND pa.status = 'draft'
    ORDER BY pa.created_at DESC, q.sort_order
  `).all(userId);

  return { user, saved_answers: answers, mypage_answers: mypageAnswers };
}

function update(userId, { phone, car_number, email, answers }) {
  const sets = []; const params = [];
  if (phone !== undefined) { sets.push('phone = ?'); params.push(phone); }
  if (car_number !== undefined) { sets.push('car_number = ?'); params.push(car_number); }
  if (email !== undefined) { sets.push('email = ?'); params.push(email); }
  if (answers !== undefined) { sets.push('mypage_answers = ?'); params.push(answers); }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now','localtime')");
    params.push(userId);
    try {
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        throw new ConflictError('이미 사용 중인 전화번호 또는 이메일입니다.');
      }
      throw err;
    }
  }
  logger.info(`MyPage updated: userId=${userId}`);
  return { id: userId };
}

module.exports = { get, update };

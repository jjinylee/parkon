const db = require('../config/database');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function list({ status, search, page, limit }) {
  let where = 'WHERE deleted_at IS NULL';
  const params = [];

  if (status && status !== 'all') {
    where += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM users ${where}`).get(...params).cnt;
  const offset = (page - 1) * limit;
  const items = db.prepare(
    `SELECT id, name, email, phone, role, status, blocked_at, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { total, page, limit, items };
}

function updateStatus(id, status, adminId) {
  const user = db.prepare('SELECT id, status FROM users WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!user) {
    throw new NotFoundError('사용자를 찾을 수 없습니다.');
  }
  if (user.status === status) {
    throw new AppError('CONFLICT', `이미 ${status === 'approved' ? '승인' : '차단'}된 사용자입니다.`, 409);
  }

  if (status === 'blocked') {
    db.prepare("UPDATE users SET status = 'blocked', blocked_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE users SET status = 'approved', blocked_at = NULL, updated_at = datetime('now','localtime') WHERE id = ?").run(id);
  }

  logger.info(`User status updated: userId=${id}, newStatus=${status}, by=${adminId}`);
  return { id, status };
}

module.exports = { list, updateStatus };

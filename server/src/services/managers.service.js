const db = require('../config/database');
const { NotFoundError, ConflictError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function list({ page, limit }) {
  const total = db.prepare(`
    SELECT COUNT(*) as cnt FROM admin_managers WHERE revoked_at IS NULL
  `).get().cnt;

  const offset = (page - 1) * limit;
  const items = db.prepare(`
    SELECT am.id, am.user_id, u.name, u.email, u.role, am.created_by, am.created_at
    FROM admin_managers am
    JOIN users u ON u.id = am.user_id
    WHERE am.revoked_at IS NULL
    ORDER BY am.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return { total, page, limit, items };
}

function create(userId, adminId, role = 'admin') {
  const user = db.prepare('SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL').get(userId);
  if (!user) {
    throw new NotFoundError('사용자를 찾을 수 없습니다.');
  }
  if (user.role === 'super_admin') {
    throw new AppError('CONFLICT', '최고 관리자는 지정 대상이 아닙니다.', 409);
  }

  const targetRole = role === 'super_admin' ? 'super_admin' : 'admin';

  const existing = db.prepare('SELECT id, revoked_at FROM admin_managers WHERE user_id = ?').get(userId);
  if (existing) {
    if (existing.revoked_at === null) {
      throw new ConflictError('이미 관리자로 지정된 사용자입니다.');
    }
    db.prepare("UPDATE admin_managers SET revoked_at = NULL, created_by = ?, created_at = datetime('now','localtime') WHERE user_id = ?").run(adminId, userId);
  } else {
    db.prepare('INSERT INTO admin_managers (user_id, created_by) VALUES (?, ?)').run(userId, adminId);
  }

  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(targetRole, userId);
  logger.info(`Admin created: userId=${userId}, role=${targetRole}, by=${adminId}`);
  return { user_id: userId };
}

function remove(userId, adminId) {
  const manager = db.prepare('SELECT id FROM admin_managers WHERE user_id = ? AND revoked_at IS NULL').get(userId);
  if (!manager) {
    throw new NotFoundError('현재 관리자로 지정된 사용자가 아닙니다.');
  }

  db.prepare("UPDATE admin_managers SET revoked_at = datetime('now','localtime') WHERE user_id = ?").run(userId);
  db.prepare("UPDATE users SET role = 'user', updated_at = datetime('now','localtime') WHERE id = ?").run(userId);
  logger.info(`Admin revoked: userId=${userId}, by=${adminId}`);
  return { user_id: userId };
}

module.exports = { list, create, remove };

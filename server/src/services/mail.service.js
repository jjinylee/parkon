const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

function list() {
  return db.prepare(`
    SELECT mt.*, u.name AS created_by_name
    FROM mail_templates mt
    JOIN users u ON u.id = mt.created_by
    ORDER BY mt.created_at DESC
  `).all();
}

function create({ title, content }, userId) {
  const result = db.prepare('INSERT INTO mail_templates (title, content, created_by) VALUES (?, ?, ?)').run(title, content, userId);
  logger.info(`Mail template created: id=${result.lastInsertRowid}, by=${userId}`);
  return { id: result.lastInsertRowid };
}

function update(id, { title, content, status }) {
  const tmpl = db.prepare('SELECT id FROM mail_templates WHERE id = ?').get(id);
  if (!tmpl) throw new NotFoundError('메일 템플릿을 찾을 수 없습니다.');
  const sets = []; const params = [];
  if (title !== undefined) { sets.push('title = ?'); params.push(title); }
  if (content !== undefined) { sets.push('content = ?'); params.push(content); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (sets.length === 0) return { id };
  sets.push("updated_at = datetime('now','localtime')");
  params.push(id);
  db.prepare(`UPDATE mail_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return { id };
}

function remove(id) {
  const tmpl = db.prepare('SELECT id FROM mail_templates WHERE id = ?').get(id);
  if (!tmpl) throw new NotFoundError('메일 템플릿을 찾을 수 없습니다.');
  db.prepare('DELETE FROM mail_templates WHERE id = ?').run(id);
  logger.info(`Mail template deleted: id=${id}`);
}

module.exports = { list, create, update, remove };

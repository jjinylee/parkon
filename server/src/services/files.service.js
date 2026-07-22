const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/templates');

function getByTemplate(templateId) {
  return db.prepare(`
    SELECT id, template_id, original_name, stored_name, mime_type, size, created_at
    FROM template_attachments
    WHERE template_id = ?
    ORDER BY created_at ASC
  `).all(templateId);
}

function getById(id) {
  const file = db.prepare(`
    SELECT id, template_id, original_name, stored_name, mime_type, size, created_at
    FROM template_attachments WHERE id = ?
  `).get(id);
  if (!file) throw new NotFoundError('파일을 찾을 수 없습니다.');
  return file;
}

function save(templateId, files) {
  const insert = db.prepare(`
    INSERT INTO template_attachments (template_id, original_name, stored_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `);

  const results = [];
  for (const f of files) {
    const r = insert.run(templateId, f.originalname, f.filename, f.mimetype, f.size);
    results.push({ id: r.lastInsertRowid, original_name: f.originalname, size: f.size });
  }
  logger.info(`Files saved: templateId=${templateId}, count=${files.length}`);
  return results;
}

function remove(id) {
  const file = getById(id);
  const filePath = path.join(UPLOAD_DIR, file.stored_name);
  try { fs.unlinkSync(filePath); } catch (_) {}
  db.prepare('DELETE FROM template_attachments WHERE id = ?').run(id);
  logger.info(`File deleted: id=${id}, name=${file.original_name}`);
}

module.exports = { getByTemplate, getById, save, remove };

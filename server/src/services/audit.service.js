const db = require('../config/database');

function log(adminId, action, targetType, targetId, detail, ipAddress) {
  const admin = db.prepare('SELECT name FROM users WHERE id = ?').get(adminId);
  const adminName = admin ? admin.name : 'unknown';
  db.prepare(`
    INSERT INTO privacy_audit_log (admin_id, admin_name, action, target_type, target_id, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, adminName, action, targetType, targetId, detail, ipAddress);
}

function list({ page, limit }) {
  const total = db.prepare('SELECT COUNT(*) as cnt FROM privacy_audit_log').get().cnt;
  const offset = (page - 1) * limit;
  const items = db.prepare(`
    SELECT * FROM privacy_audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  return { total, page, limit, items };
}

module.exports = { log, list };

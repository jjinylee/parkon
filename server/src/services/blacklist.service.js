const crypto = require('crypto');
const db = require('../config/database');

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function add(token, userId, expiresAt) {
  const hash = tokenHash(token);
  db.prepare(
    'INSERT INTO token_blacklist (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(hash, userId, expiresAt);
}

function isBlacklisted(token) {
  const hash = tokenHash(token);
  const row = db.prepare(
    'SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > datetime(\'now\')'
  ).get(hash);
  return !!row;
}

function cleanExpired() {
  db.prepare("DELETE FROM token_blacklist WHERE expires_at <= datetime('now')").run();
}

module.exports = { add, isBlacklisted, cleanExpired };

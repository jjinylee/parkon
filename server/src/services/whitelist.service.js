const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');
const { encrypt, decrypt, hash: piiHash } = require('../utils/encrypt');

function list({ search, page, limit }) {
  let where = 'WHERE 1=1';
  const params = [];
  if (search) {
    where += ' AND (name LIKE ? OR car_number_hash = ?)';
    params.push(`%${search}%`, piiHash(search));
  }
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM whitelist ${where}`).get(...params).cnt;
  const offset = (page - 1) * limit;
  const items = db.prepare(`SELECT * FROM whitelist ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  for (const item of items) {
    item.phone = decrypt(item.phone);
    item.car_number = decrypt(item.car_number);
  }
  return { total, page, limit, items };
}

function create({ name, car_number, phone, position }, userId) {
  const encryptedCar = encrypt(car_number);
  const carHash = piiHash(car_number);
  const encryptedPhone = phone ? encrypt(phone) : '';
  const phoneHash = phone ? piiHash(phone) : '';
  const result = db.prepare(
    'INSERT INTO whitelist (name, car_number, car_number_hash, phone, phone_hash, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, encryptedCar, carHash, encryptedPhone, phoneHash, position || null, userId);
  logger.info(`Whitelist created: id=${result.lastInsertRowid}, by=${userId}`);
  return { id: result.lastInsertRowid };
}

function remove(ids) {
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM whitelist WHERE id IN (${placeholders})`).run(...ids);
  logger.info(`Whitelist deleted: ids=${ids.join(',')}, count=${result.changes}`);
  return { deleted: result.changes };
}

module.exports = { list, create, remove };

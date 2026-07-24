require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/database');
const { encrypt, hash } = require('../utils/encrypt');

const users = db.prepare("SELECT id, phone, car_number FROM users WHERE phone_hash IS NULL AND deleted_at IS NULL").all();
for (const u of users) {
  const encryptedPhone = u.phone ? encrypt(u.phone) : '';
  const phoneHash = u.phone ? hash(u.phone) : '';
  const encryptedCar = u.car_number ? encrypt(u.car_number) : '';
  const carHash = u.car_number ? hash(u.car_number) : '';
  db.prepare('UPDATE users SET phone = ?, phone_hash = ?, car_number = ?, car_number_hash = ? WHERE id = ?')
    .run(encryptedPhone, phoneHash, encryptedCar, carHash, u.id);
}
console.log(`  Encrypted ${users.length} users' PII`);

const whitelist = db.prepare("SELECT id, phone, car_number FROM whitelist WHERE phone_hash IS NULL").all();
for (const w of whitelist) {
  const encryptedPhone = w.phone ? encrypt(w.phone) : '';
  const phoneHash = w.phone ? hash(w.phone) : '';
  const encryptedCar = w.car_number ? encrypt(w.car_number) : '';
  const carHash = w.car_number ? hash(w.car_number) : '';
  db.prepare('UPDATE whitelist SET phone = ?, phone_hash = ?, car_number = ?, car_number_hash = ? WHERE id = ?')
    .run(encryptedPhone, phoneHash, encryptedCar, carHash, w.id);
}
console.log(`  Encrypted ${whitelist.length} whitelist entries' PII`);
process.exit(0);

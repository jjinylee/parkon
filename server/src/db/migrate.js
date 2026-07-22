require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, run_at TEXT NOT NULL DEFAULT (datetime('now','localtime')))`);

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

const applied = new Set(
  db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
);

const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

for (const file of files) {
  if (applied.has(file)) {
    console.log(`  - ${file} (already applied)`);
    continue;
  }
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
  insert.run(file);
  console.log(`  ✓ ${file}`);
}
console.log('All migrations completed successfully.');
process.exit(0);

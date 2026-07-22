const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.env.DB_PATH || './data/parkon.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;

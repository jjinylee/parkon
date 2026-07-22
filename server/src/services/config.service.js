const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const CONFIG_KEY = 'question_config';
const DEFAULT_CONFIG_PATH = path.join(__dirname, '../../../parking_score_config.json');

function get(key) {
  const row = db.prepare('SELECT value, updated_at FROM app_config WHERE key = ?').get(key);
  if (!row) return null;
  return { key, value: JSON.parse(row.value), updated_at: row.updated_at };
}

function set(key, value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  db.prepare(`
    INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, json);
  logger.info(`Config updated: key=${key}`);
  return { key, value, updated_at: new Date().toISOString() };
}

function loadDefaultQuestions() {
  try {
    const raw = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    set(CONFIG_KEY, parsed);
    logger.info(`Default question config loaded from ${DEFAULT_CONFIG_PATH}`);
    return parsed;
  } catch (err) {
    logger.error(`Failed to load default config: ${err.message}`);
    throw err;
  }
}

function getQuestions() {
  const config = get(CONFIG_KEY);
  if (!config) return loadDefaultQuestions();
  return config.value;
}

function setQuestions(questions) {
  return set(CONFIG_KEY, questions);
}

module.exports = { get, set, getQuestions, setQuestions };

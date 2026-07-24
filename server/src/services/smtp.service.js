const db = require('../config/database');
const nodemailer = require('nodemailer');
const { encrypt, decrypt } = require('../utils/encrypt');

function getConfig() {
  return db.prepare('SELECT * FROM smtp_config WHERE id = 1').get() || null;
}

function getDecryptedConfig() {
  const cfg = getConfig();
  if (!cfg) return null;
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    pass: decrypt(cfg.encrypted_pass),
    from_email: cfg.from_email,
  };
}

function updateConfig({ host, port, user, password, from_email }) {
  const encrypted_pass = password ? encrypt(password) : '';
  db.prepare(`
    UPDATE smtp_config SET host = ?, port = ?, user = ?, encrypted_pass = ?, from_email = ?, updated_at = datetime('now','localtime')
    WHERE id = 1
  `).run(host, port, user, encrypted_pass, from_email);
  return getConfig();
}

function testConnection({ host, port, user, password, from_email }) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && password ? { user, pass: password } : undefined,
      ignoreTLS: !user && !password,
    });

    transporter.verify((err) => {
      if (err) return reject(new Error(`SMTP 연결 실패: ${err.message}`));
      if (!from_email) return resolve('SMTP 연결 성공 (발신자 이메일 없음)');

      transporter.sendMail({
        from: from_email,
        to: from_email,
        subject: '[주차신청] SMTP 설정 테스트 메일',
        text: 'SMTP 설정이 정상적으로 동작합니다.',
      }, (err2) => {
        if (err2) return reject(new Error(`테스트 메일 발송 실패: ${err2.message}`));
        resolve('SMTP 연결 및 테스트 메일 발송 성공');
      });
    });
  });
}

module.exports = { getConfig, getDecryptedConfig, updateConfig, testConnection };

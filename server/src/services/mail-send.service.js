const nodemailer = require('nodemailer');
const db = require('../config/database');
const logger = require('../utils/logger');

function getTransporter() {
  const host = process.env.SMTP_HOST || 'localhost';
  const port = parseInt(process.env.SMTP_PORT || '1025', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user && !pass) {
    return nodemailer.createTransport({ host, port, ignoreTLS: true });
  }
  return nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function renderContent(template, { name, reason, template_title }) {
  return template
    .replace(/\{name\}/g, name || '')
    .replace(/\{reason\}/g, reason || '')
    .replace(/\{template_title\}/g, template_title || '');
}

async function send({ template_id, application_ids, type, adminId }) {
  const tmpl = db.prepare('SELECT * FROM mail_templates WHERE id = ?').get(template_id);
  if (!tmpl) throw new Error('메일 템플릿을 찾을 수 없습니다.');

  const apps = db.prepare(`
    SELECT pa.id, pa.admin_memo, u.name, u.email, t.title AS template_title
    FROM parking_applications pa
    JOIN users u ON u.id = pa.user_id
    JOIN application_templates t ON t.id = pa.template_id
    WHERE pa.id IN (${application_ids.map(() => '?').join(',')})
  `).all(...application_ids);

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || 'parkon@company.com';
  const results = [];

  for (const app of apps) {
    try {
      const html = renderContent(tmpl.content, {
        name: app.name,
        reason: app.admin_memo || (type === 'approved' ? '배정 기준에 따라 선정되었습니다.' : '배정 기준에 따라 선정되지 않았습니다.'),
        template_title: app.template_title,
      });
      const text = html.replace(/<[^>]*>/g, '');

      await transporter.sendMail({
        from,
        to: app.email,
        subject: tmpl.title,
        html,
        text,
      });

      db.prepare(`
        INSERT INTO mail_logs (application_id, template_id, recipient_email, recipient_name, type, status)
        VALUES (?, ?, ?, ?, ?, 'sent')
      `).run(app.id, template_id, app.email, app.name, type);

      results.push({ application_id: app.id, email: app.email, status: 'sent' });
      logger.info(`Mail sent: app=${app.id}, email=${app.email}, template=${template_id}`);
    } catch (err) {
      db.prepare(`
        INSERT INTO mail_logs (application_id, template_id, recipient_email, recipient_name, type, status, error_message)
        VALUES (?, ?, ?, ?, ?, 'failed', ?)
      `).run(app.id, template_id, app.email, app.name, type, err.message);

      results.push({ application_id: app.id, email: app.email, status: 'failed', error: err.message });
      logger.error(`Mail failed: app=${app.id}, email=${app.email}, error=${err.message}`);
    }
  }

  return results;
}

function getLogs(applicationId) {
  return db.prepare(`
    SELECT ml.*, mt.title AS template_title
    FROM mail_logs ml
    JOIN mail_templates mt ON mt.id = ml.template_id
    WHERE ml.application_id = ?
    ORDER BY ml.sent_at DESC
  `).all(applicationId);
}

module.exports = { send, getLogs, getTransporter };

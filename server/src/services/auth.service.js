const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const authConfig = require('../config/auth');
const { AuthError, ForbiddenError, ConflictError, NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { getTransporter } = require('./mail-send.service');

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MINUTES = 5;
const RESET_EXPIRY_HOURS = 1;

async function signup({ name, phone, email, password }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
  if (existing) {
    throw new ConflictError('이미 등록된 이메일 또는 전화번호입니다.');
  }
  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, phone, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, phone, email, hash, 'user', 'pending');
  logger.info(`User signed up: id=${result.lastInsertRowid}, email=${email}`);
  return { id: result.lastInsertRowid, status: 'pending' };
}

async function login({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
  if (!user) {
    throw new AuthError('이메일 또는 비밀번호가 일치하지 않습니다.');
  }
  if (user.status === 'pending') {
    throw new ForbiddenError('관리자 승인 대기중입니다.');
  }
  if (user.status === 'blocked') {
    throw new ForbiddenError('차단된 계정입니다.');
  }

  // Check if account is locked
  if (user.locked_until) {
    const lockedUntil = new Date(user.locked_until + 'Z').getTime();
    if (Date.now() < lockedUntil) {
      const timeStr = new Date(lockedUntil).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      throw new ForbiddenError(
        `5회 연속 로그인 실패로 ${timeStr} 이후 로그인이 가능합니다. 비밀번호 찾기를 이용해주세요.`
      );
    }
    // Lock expired, reset
    db.prepare('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const attempts = (user.login_attempts || 0) + 1;
    if (attempts >= LOCK_THRESHOLD) {
      const lockTime = Date.now() + LOCK_DURATION_MINUTES * 60000;
      const lockedUntil = new Date(lockTime).toISOString().replace('Z', '');
      const timeStr = new Date(lockTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      db.prepare('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?')
        .run(attempts, lockedUntil, user.id);
      throw new ForbiddenError(
        `5회 연속 로그인 실패로 ${timeStr} 이후 로그인이 가능합니다. 비밀번호 찾기를 이용해주세요.`
      );
    }
    db.prepare('UPDATE users SET login_attempts = ? WHERE id = ?').run(attempts, user.id);
    const remain = LOCK_THRESHOLD - attempts;
    throw new AuthError(
      `이메일 또는 비밀번호가 일치하지 않습니다. (남은 시도: ${remain}회)`
    );
  }

  // Success — reset attempts
  db.prepare('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    authConfig.secret,
    { expiresIn: authConfig.expiresIn }
  );
  logger.info(`User logged in: id=${user.id}, email=${email}`);
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
  };
}

async function forgotPassword({ email }) {
  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
  if (!user) {
    return { message: '비밀번호 재설정 링크를 이메일로 발송했습니다.' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 3600000).toISOString().replace('Z', '');

  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?')
    .run(token, expires, user.id);

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const html = `<p>안녕하세요, ${user.name}님.</p><p>비밀번호 재설정을 요청하셨습니다.</p><p>아래 링크를 클릭하여 새 비밀번호를 설정해주세요.</p><p><a href="${resetLink}">${resetLink}</a></p><p>이 링크는 1시간 후 만료됩니다.</p><p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>`;

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || 'parkon@company.com';
  await transporter.sendMail({ from, to: user.email, subject: '[ParkON] 비밀번호 재설정 안내', html });

  logger.info(`Password reset email sent: id=${user.id}, email=${email}`);
  return { message: '비밀번호 재설정 링크를 이메일로 발송했습니다.' };
}

async function resetPassword({ token, password }) {
  const user = db.prepare(
    'SELECT id, reset_token, reset_expires FROM users WHERE reset_token = ? AND deleted_at IS NULL'
  ).get(token);
  if (!user) {
    throw new NotFoundError('유효하지 않은 토큰입니다.');
  }
  if (user.reset_expires) {
    const expires = new Date(user.reset_expires + 'Z').getTime();
    if (Date.now() > expires) {
      throw new AppError('TOKEN_EXPIRED', '토큰이 만료되었습니다. 비밀번호 찾기를 다시 시도해주세요.', 410);
    }
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare(`
    UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL, login_attempts = 0, locked_until = NULL
    WHERE id = ?
  `).run(hash, user.id);

  logger.info(`Password reset completed: id=${user.id}`);
  return { message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.' };
}

module.exports = { signup, login, forgotPassword, resetPassword };

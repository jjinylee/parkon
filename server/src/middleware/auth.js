const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { AuthError } = require('../utils/errors');
const blacklist = require('../services/blacklist.service');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AuthError();
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, authConfig.secret);
    if (blacklist.isBlacklisted(token)) {
      throw new AuthError('로그아웃된 토큰입니다.');
    }
    req.user = { userId: decoded.userId, role: decoded.role };
    req.token = token;
    req.tokenExp = decoded.exp;
    next();
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('토큰이 만료되었거나 유효하지 않습니다.');
  }
}

module.exports = authenticate;

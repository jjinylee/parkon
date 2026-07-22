const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { AuthError } = require('../utils/errors');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AuthError();
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, authConfig.secret);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch {
    throw new AuthError('토큰이 만료되었거나 유효하지 않습니다.');
  }
}

module.exports = authenticate;

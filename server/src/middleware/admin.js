const { ForbiddenError } = require('../utils/errors');

function requireAdmin(req, _res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    throw new ForbiddenError('관리자만 접근 가능합니다.');
  }
  next();
}

function requireSuperAdmin(req, _res, next) {
  if (req.user.role !== 'super_admin') {
    throw new ForbiddenError('최고 관리자만 접근 가능합니다.');
  }
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };

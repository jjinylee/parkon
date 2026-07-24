const Joi = require('joi');
const { AppError } = require('../utils/errors');
const usersService = require('../services/users.service');
const auditService = require('../services/audit.service');
const { success } = require('../utils/response');

const statusSchema = Joi.object({
  status: Joi.string().valid('approved', 'blocked').required().messages({
    'any.only': '상태는 approved 또는 blocked만 가능합니다.',
    'any.required': '상태는 필수입니다.',
  }),
});

async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = usersService.list({ status, search, page: Number(page), limit: Number(limit) });
    auditService.log(req.user.userId, 'VIEW_USER_LIST', 'users', null, `검색: ${search || '전체'}`, req.ip);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { error, value } = statusSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = usersService.updateStatus(Number(req.params.id), value.status, req.user.userId);
    auditService.log(req.user.userId, 'UPDATE_USER_STATUS', 'users', Number(req.params.id), `상태: ${value.status}`, req.ip);
    return success(res, result, '사용자 상태가 변경되었습니다.');
  } catch (err) {
    next(err);
  }
}

async function withdraw(req, res, next) {
  try {
    const result = usersService.withdraw(req.user.userId);
    return success(res, result, '회원 탈퇴가 완료되었습니다.');
  } catch (err) {
    next(err);
  }
}

async function exportCSV(req, res, next) {
  try {
    const items = usersService.exportAll();
    const bom = '\uFEFF';
    const header = '이름,이메일,전화번호,권한,상태,가입일';
    const body = items.map(u =>
      [u.name, u.email, u.phone, u.role,
       u.status === 'approved' ? '승인' : u.status === 'pending' ? '대기' : '차단',
       u.created_at]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    return res.send(bom + header + '\n' + body);
  } catch (err) { next(err); }
}

module.exports = { list, updateStatus, withdraw, exportCSV };

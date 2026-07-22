const Joi = require('joi');
const { AppError } = require('../utils/errors');
const usersService = require('../services/users.service');
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
    return success(res, result, '사용자 상태가 변경되었습니다.');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, updateStatus };

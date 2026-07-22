const Joi = require('joi');
const { AppError } = require('../utils/errors');
const managersService = require('../services/managers.service');
const { success } = require('../utils/response');

const createSchema = Joi.object({
  user_id: Joi.number().integer().positive().required().messages({
    'any.required': '사용자 ID는 필수입니다.',
    'number.base': '사용자 ID는 숫자여야 합니다.',
  }),
});

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = managersService.list({ page: Number(page), limit: Number(limit) });
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = managersService.create(value.user_id, req.user.userId);
    return success(res, result, '관리자가 지정되었습니다.', 201);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = managersService.remove(Number(req.params.userId), req.user.userId);
    return success(res, result, '관리자 권한이 해제되었습니다.');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };

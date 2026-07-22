const Joi = require('joi');
const mypageService = require('../services/mypage.service');
const { AppError } = require('../utils/errors');
const { success } = require('../utils/response');

const updateSchema = Joi.object({
  phone: Joi.string().pattern(/^010-\d{4}-\d{4}$/).allow(''),
  car_number: Joi.string().max(20).allow(''),
  email: Joi.string().email().allow(''),
  answers: Joi.string().allow(''),
});

async function get(req, res, next) {
  try { const result = mypageService.get(req.user.userId); return success(res, result); }
  catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) { const messages = error.details.map(d => d.message).join(', '); throw new AppError('VALIDATION_ERROR', messages, 400); }
    const result = mypageService.update(req.user.userId, value);
    return success(res, result, '수정되었습니다.');
  } catch (err) { next(err); }
}

module.exports = { get, update };

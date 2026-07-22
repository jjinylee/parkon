const Joi = require('joi');
const { AppError } = require('../utils/errors');
const whitelistService = require('../services/whitelist.service');
const { success } = require('../utils/response');

const createSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  car_number: Joi.string().min(1).max(20).required(),
  phone: Joi.string().max(20).required(),
  position: Joi.string().max(50).allow('', null),
});

const removeSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
});

async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const result = whitelistService.list({ search, page: Number(page), limit: Number(limit) });
    return success(res, result);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = whitelistService.create(value, req.user.userId);
    return success(res, result, '등록되었습니다.', 201);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { error, value } = removeSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = whitelistService.remove(value.ids);
    return success(res, result, '삭제되었습니다.');
  } catch (err) { next(err); }
}

module.exports = { list, create, remove };

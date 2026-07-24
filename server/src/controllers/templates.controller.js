const Joi = require('joi');
const { AppError } = require('../utils/errors');
const templatesService = require('../services/templates.service');
const { success } = require('../utils/response');

const createSchema = Joi.object({
  title: Joi.string().min(2).max(200).required().messages({ 'any.required': '제목은 필수입니다.', 'string.min': '제목은 2자 이상이어야 합니다.' }),
  description: Joi.string().allow('', null),
  start_date: Joi.string().required().messages({ 'any.required': '시작일은 필수입니다.' }),
  end_date: Joi.string().required().messages({ 'any.required': '종료일은 필수입니다.' }),
  allow_modify: Joi.boolean().default(true),
});

const updateSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().allow('', null),
  start_date: Joi.string(),
  end_date: Joi.string(),
  allow_modify: Joi.boolean(),
  status: Joi.string().valid('draft', 'published', 'closed'),
});

const questionSchema = Joi.object({
  question_text: Joi.string().required(),
  input_type: Joi.string().valid('text', 'radio', 'date', 'textarea').required(),
  is_required: Joi.boolean().default(true),
  score: Joi.number().integer().min(0).default(0),
  sort_order: Joi.number().integer().min(0).default(0),
  placeholder: Joi.string().allow('', null),
  options: Joi.array().items(Joi.object({
    option_text: Joi.string().required(),
    score: Joi.number().integer().min(0).default(0),
    sort_order: Joi.number().integer().min(0).default(0),
  })),
});

const questionsBatchSchema = Joi.array().items(questionSchema);

const updateQuestionSchema = Joi.object({
  question_text: Joi.string(),
  input_type: Joi.string().valid('text', 'radio', 'date', 'textarea'),
  is_required: Joi.boolean(),
  score: Joi.number().integer().min(0),
  sort_order: Joi.number().integer().min(0),
  placeholder: Joi.string().allow('', null),
});

async function list(req, res, next) {
  try {
    const result = templatesService.list({ status: req.query.status });
    return success(res, result);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const result = templatesService.getById(Number(req.params.id));
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
    const result = templatesService.create(value, req.user.userId);
    return success(res, result, '템플릿이 생성되었습니다.', 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = templatesService.update(Number(req.params.id), value, req.user.userId);
    return success(res, result, '템플릿이 수정되었습니다.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    templatesService.remove(Number(req.params.id));
    return success(res, null, '템플릿이 삭제되었습니다.');
  } catch (err) { next(err); }
}

async function getQuestions(req, res, next) {
  try {
    const result = templatesService.getQuestions(Number(req.params.id));
    return success(res, result);
  } catch (err) { next(err); }
}

async function saveQuestions(req, res, next) {
  try {
    const { error, value } = questionsBatchSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = templatesService.saveQuestions(Number(req.params.id), value, req.user.userId);
    return success(res, result, '질문이 저장되었습니다.');
  } catch (err) { next(err); }
}

async function updateQuestion(req, res, next) {
  try {
    const { error, value } = updateQuestionSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = templatesService.updateQuestion(Number(req.params.id), value);
    return success(res, result, '질문이 수정되었습니다.');
  } catch (err) { next(err); }
}

async function deleteQuestion(req, res, next) {
  try {
    templatesService.deleteQuestion(Number(req.params.id));
    return success(res, null, '질문이 삭제되었습니다.');
  } catch (err) { next(err); }
}

async function finalize(req, res, next) {
  try {
    const result = templatesService.finalize(Number(req.params.id));
    return success(res, result, '템플릿이 마감 처리되었습니다.');
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, getQuestions, saveQuestions, updateQuestion, deleteQuestion, finalize };

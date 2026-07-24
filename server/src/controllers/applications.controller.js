const Joi = require('joi');
const { AppError } = require('../utils/errors');
const applicationsService = require('../services/applications.service');
const auditService = require('../services/audit.service');
const { success } = require('../utils/response');

const createSchema = Joi.object({
  template_id: Joi.number().integer().positive().required().messages({
    'any.required': '템플릿 ID는 필수입니다.',
  }),
});

const updateSchema = Joi.object({
  action: Joi.string().valid('submit'),
  consent_agreed: Joi.boolean().allow(null),
  answers: Joi.array().items(Joi.object({
    question_id: Joi.number().integer().positive().required(),
    option_id: Joi.number().integer().positive().allow(null),
    answer_text: Joi.string().allow('', null),
  })).required(),
});

const approveSchema = Joi.object({
  approved_count: Joi.number().integer().positive(),
});

const rejectSchema = Joi.object({
  reason: Joi.string().min(1).required().messages({
    'any.required': '반려 사유는 필수입니다.',
  }),
});

async function getUserList(req, res, next) {
  try {
    const result = applicationsService.getUserApplications(req.user.userId, req.query.status);
    return success(res, result);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const result = applicationsService.getById(Number(req.params.id));
    if (result.user_id !== req.user.userId && req.user.role === 'user') {
      throw new AppError('FORBIDDEN', '본인의 신청만 조회할 수 있습니다.', 403);
    }
    if (req.user.role !== 'user') {
      auditService.log(req.user.userId, 'VIEW_APPLICATION_DETAIL', 'applications', Number(req.params.id), '', req.ip);
    }
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
    const result = applicationsService.create(req.user.userId, value.template_id);
    return success(res, result, '임시저장되었습니다.', 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = applicationsService.update(Number(req.params.id), req.user.userId, value);
    const msg = value.action === 'submit' ? '제출되었습니다.' : '임시저장되었습니다.';
    return success(res, result, msg);
  } catch (err) { next(err); }
}

async function getAdminList(req, res, next) {
  try {
    const { template_id, status, search, sort_by, sort_order, page = 1, limit = 20 } = req.query;
    const result = applicationsService.getAdminList({
      template_id: template_id ? Number(template_id) : null,
      status, search, sort_by, sort_order,
      page: Number(page), limit: Number(limit),
    });
    auditService.log(req.user.userId, 'VIEW_APPLICATION_LIST', 'applications', null, `template_id: ${template_id || 'all'}, 검색: ${search || ''}`, req.ip);
    return success(res, result);
  } catch (err) { next(err); }
}

async function approve(req, res, next) {
  try {
    const { error, value } = approveSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = applicationsService.approve(Number(req.params.id), req.user.userId, value.approved_count);
    return success(res, result, '승인되었습니다.');
  } catch (err) { next(err); }
}

async function reject(req, res, next) {
  try {
    const { error, value } = rejectSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = applicationsService.reject(Number(req.params.id), req.user.userId, value.reason);
    return success(res, result, '반려되었습니다.');
  } catch (err) { next(err); }
}

module.exports = { getUserList, getById, create, update, getAdminList, approve, reject };

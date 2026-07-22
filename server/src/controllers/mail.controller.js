const Joi = require('joi');
const { AppError } = require('../utils/errors');
const mailService = require('../services/mail.service');
const mailSendService = require('../services/mail-send.service');
const { success } = require('../utils/response');

const createSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().required(),
});

const updateSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  content: Joi.string(),
  status: Joi.string().valid('active', 'inactive'),
});

const sendSchema = Joi.object({
  template_id: Joi.number().integer().required(),
  type: Joi.string().valid('approved', 'rejected').required(),
  application_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
});

async function list(req, res, next) {
  try { const result = mailService.list(); return success(res, result); }
  catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) { const messages = error.details.map(d => d.message).join(', '); throw new AppError('VALIDATION_ERROR', messages, 400); }
    const result = mailService.create(value, req.user.userId);
    return success(res, result, '등록되었습니다.', 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) { const messages = error.details.map(d => d.message).join(', '); throw new AppError('VALIDATION_ERROR', messages, 400); }
    const result = mailService.update(Number(req.params.id), value);
    return success(res, result, '수정되었습니다.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { mailService.remove(Number(req.params.id)); return success(res, null, '삭제되었습니다.'); }
  catch (err) { next(err); }
}

async function sendMail(req, res, next) {
  try {
    const { error, value } = sendSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) { const messages = error.details.map(d => d.message).join(', '); throw new AppError('VALIDATION_ERROR', messages, 400); }
    const results = await mailSendService.send({ ...value, adminId: req.user.userId });
    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    return success(res, { total: results.length, sent, failed, results }, '발송 완료');
  } catch (err) { next(err); }
}

async function getMailLogs(req, res, next) {
  try {
    const result = mailSendService.getLogs(Number(req.params.applicationId));
    return success(res, result);
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, sendMail, getMailLogs };

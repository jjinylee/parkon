const Joi = require('joi');
const { AppError } = require('../utils/errors');
const configService = require('../services/config.service');
const smtpService = require('../services/smtp.service');
const { success } = require('../utils/response');

const questionsSchema = Joi.object({
  version: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  questions: Joi.array().items(Joi.object({
    question_no: Joi.number().integer().required(),
    question_id: Joi.string().required(),
    info_type: Joi.string().valid('basic', 'apply').optional(),
    title: Joi.string().optional().allow(''),
    label: Joi.string().required(),
    placeholder: Joi.string().optional().allow(''),
    required: Joi.boolean().default(true),
    type: Joi.string().valid('text', 'radio', 'date', 'textarea').required(),
    scored: Joi.boolean().default(false),
    grid_view: Joi.boolean().optional(),
    hint: Joi.string().optional().allow(''),
    note: Joi.string().optional().allow(''),
    options: Joi.array().items(Joi.object({
      option_id: Joi.string().optional(),
      label: Joi.string().required(),
      score: Joi.number().integer().min(0).default(0),
    })).optional(),
  })).min(1).required(),
});

async function getQuestions(req, res, next) {
  try {
    const result = configService.getQuestions();
    return success(res, result);
  } catch (err) { next(err); }
}

async function updateQuestions(req, res, next) {
  try {
    const { error, value } = questionsSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = configService.setQuestions(value);
    return success(res, result, '질문 설정이 저장되었습니다.');
  } catch (err) { next(err); }
}

const smtpSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().integer().min(1).max(65535).required(),
  user: Joi.string().allow('').optional(),
  password: Joi.string().allow('').optional(),
  from_email: Joi.string().email().required(),
});

async function getSmtpConfig(req, res, next) {
  try {
    const cfg = smtpService.getConfig();
    if (!cfg) return success(res, null);
    return success(res, {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      from_email: cfg.from_email,
      has_password: !!cfg.encrypted_pass,
    });
  } catch (err) { next(err); }
}

async function updateSmtpConfig(req, res, next) {
  try {
    const { error, value } = smtpSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const prev = smtpService.getDecryptedConfig();
    const password = value.password || (prev ? prev.pass : '');
    smtpService.updateConfig({ ...value, password });
    return success(res, null, 'SMTP 설정이 저장되었습니다.');
  } catch (err) { next(err); }
}

async function testSmtpConfig(req, res, next) {
  try {
    const { error, value } = smtpSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const msg = await smtpService.testConnection(value);
    return success(res, { message: msg }, msg);
  } catch (err) { next(err); }
}

module.exports = { getQuestions, updateQuestions, getSmtpConfig, updateSmtpConfig, testSmtpConfig };

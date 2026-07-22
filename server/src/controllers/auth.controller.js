const Joi = require('joi');
const authService = require('../services/auth.service');
const { success } = require('../utils/response');
const { AppError } = require('../utils/errors');

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(20).pattern(/^[가-힣a-zA-Z0-9]+$/).required().messages({
    'string.pattern.base': '이름은 한글, 영문, 숫자만 가능합니다.',
    'string.min': '이름은 2자 이상이어야 합니다.',
    'any.required': '이름은 필수입니다.',
  }),
  phone: Joi.string().pattern(/^010-\d{4}-\d{4}$/).required().messages({
    'string.pattern.base': '전화번호 형식이 올바르지 않습니다. (010-1234-5678)',
    'any.required': '전화번호는 필수입니다.',
  }),
  email: Joi.string().email({ tlds: false }).pattern(/@mobigen\.com$/).required().messages({
    'string.email': '이메일 형식이 올바르지 않습니다.',
    'string.pattern.base': 'mobigen.com 도메인 이메일만 가입 가능합니다.',
    'any.required': '이메일은 필수입니다.',
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])/).required().messages({
    'string.min': '비밀번호는 8자 이상이어야 합니다.',
    'string.pattern.base': '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    'any.required': '비밀번호는 필수입니다.',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '이메일 형식이 올바르지 않습니다.',
    'any.required': '이메일은 필수입니다.',
  }),
  password: Joi.string().required().messages({
    'any.required': '비밀번호는 필수입니다.',
  }),
});

async function signup(req, res, next) {
  try {
    const { error, value } = signupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = await authService.signup(value);
    return success(res, result, '가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.', 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = await authService.login(value);
    return success(res, result, '로그인 성공');
  } catch (err) {
    next(err);
  }
}

const forgotSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '이메일 형식이 올바르지 않습니다.',
    'any.required': '이메일은 필수입니다.',
  }),
});

const resetSchema = Joi.object({
  token: Joi.string().required().messages({ 'any.required': '토큰이 필요합니다.' }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])/).required().messages({
    'string.min': '비밀번호는 8자 이상이어야 합니다.',
    'string.pattern.base': '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    'any.required': '비밀번호는 필수입니다.',
  }),
});

async function forgotPassword(req, res, next) {
  try {
    const { error, value } = forgotSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = await authService.forgotPassword(value);
    return success(res, result, '비밀번호 재설정 링크를 이메일로 발송했습니다.');
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { error, value } = resetSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    const result = await authService.resetPassword(value);
    return success(res, result, '비밀번호가 재설정되었습니다.');
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, forgotPassword, resetPassword };

const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  logger.error(`Unhandled error: ${err.message}\n${err.stack}`);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '서버 오류' },
  });
}

module.exports = errorHandler;

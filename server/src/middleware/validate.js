const { AppError } = require('../utils/errors');

function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      throw new AppError('VALIDATION_ERROR', messages, 400);
    }
    req.body = value;
    next();
  };
}

module.exports = validate;

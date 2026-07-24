const auditService = require('../services/audit.service');
const { success } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = auditService.list({ page: Number(page), limit: Number(limit) });
    return success(res, result);
  } catch (err) { next(err); }
}

module.exports = { list };

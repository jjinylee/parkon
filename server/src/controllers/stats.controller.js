const statsService = require('../services/stats.service');
const { success } = require('../utils/response');

async function approval(req, res, next) {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const result = statsService.approval(months);
    return success(res, result);
  } catch (err) { next(err); }
}

async function trend(req, res, next) {
  try {
    const { reference_date } = req.query;
    if (!reference_date) return success(res, []);
    const result = statsService.trendByReferenceDate(reference_date);
    return success(res, result);
  } catch (err) { next(err); }
}

module.exports = { approval, trend };

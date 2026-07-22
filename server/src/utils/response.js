function success(res, data = null, message = '요청 성공', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function fail(res, code = 'INTERNAL_ERROR', message = '서버 오류', status = 500) {
  return res.status(status).json({ success: false, error: { code, message } });
}

module.exports = { success, fail };

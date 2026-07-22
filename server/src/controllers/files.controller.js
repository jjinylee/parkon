const path = require('path');
const filesService = require('../services/files.service');
const { success } = require('../utils/response');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/templates');

async function upload(req, res, next) {
  try {
    const templateId = Number(req.params.id);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '파일이 없습니다.' } });
    }
    const result = filesService.save(templateId, req.files);
    return success(res, result, '파일이 업로드되었습니다.');
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const result = filesService.getByTemplate(Number(req.params.id));
    return success(res, result);
  } catch (err) { next(err); }
}

async function download(req, res, next) {
  try {
    const file = filesService.getById(Number(req.params.id));
    const filePath = path.join(UPLOAD_DIR, file.stored_name);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    filesService.remove(Number(req.params.fileId));
    return success(res, null, '파일이 삭제되었습니다.');
  } catch (err) { next(err); }
}

module.exports = { upload, list, download, remove };

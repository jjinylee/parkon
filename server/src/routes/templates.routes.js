const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const upload = require('../middleware/upload');
const templatesController = require('../controllers/templates.controller');
const filesController = require('../controllers/files.controller');

const router = Router();

// Public (authenticated users) — view published templates
router.get('/', authenticate, templatesController.list);
router.get('/:id', authenticate, templatesController.getById);

// Admin only — manage templates
router.post('/', authenticate, requireAdmin, templatesController.create);
router.put('/:id', authenticate, requireAdmin, templatesController.update);
router.put('/:id/finalize', authenticate, requireAdmin, templatesController.finalize);
router.delete('/:id', authenticate, requireAdmin, templatesController.remove);

// Questions (admin only)
router.get('/:id/questions', authenticate, requireAdmin, templatesController.getQuestions);
router.post('/:id/questions', authenticate, requireAdmin, templatesController.saveQuestions);

// File attachments
router.post('/:id/files', authenticate, requireAdmin, upload.array('files', 5), filesController.upload);
router.get('/:id/files', authenticate, filesController.list);
router.delete('/:id/files/:fileId', authenticate, requireAdmin, filesController.remove);

module.exports = router;

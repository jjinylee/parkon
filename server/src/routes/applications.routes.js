const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const applicationsController = require('../controllers/applications.controller');

const router = Router();

// User routes
router.get('/', authenticate, applicationsController.getUserList);
router.get('/:id', authenticate, applicationsController.getById);
router.post('/', authenticate, applicationsController.create);
router.put('/:id', authenticate, applicationsController.update);

// Admin routes
router.get('/admin/list', authenticate, requireAdmin, applicationsController.getAdminList);
router.put('/:id/approve', authenticate, requireAdmin, applicationsController.approve);
router.put('/:id/reject', authenticate, requireAdmin, applicationsController.reject);

module.exports = router;

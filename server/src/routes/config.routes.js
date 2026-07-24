const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/admin');
const configController = require('../controllers/config.controller');

const router = Router();

router.get('/questions', authenticate, configController.getQuestions);
router.put('/questions', authenticate, requireAdmin, configController.updateQuestions);

router.get('/smtp', authenticate, requireSuperAdmin, configController.getSmtpConfig);
router.put('/smtp', authenticate, requireSuperAdmin, configController.updateSmtpConfig);
router.post('/smtp/test', authenticate, requireSuperAdmin, configController.testSmtpConfig);

module.exports = router;

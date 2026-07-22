const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const configController = require('../controllers/config.controller');

const router = Router();

router.get('/questions', authenticate, configController.getQuestions);
router.put('/questions', authenticate, requireAdmin, configController.updateQuestions);

module.exports = router;

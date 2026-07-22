const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const statsController = require('../controllers/stats.controller');

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/approval', statsController.approval);
router.get('/trend', statsController.trend);

module.exports = router;

const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/admin');
const auditController = require('../controllers/audit.controller');

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/', auditController.list);

module.exports = router;

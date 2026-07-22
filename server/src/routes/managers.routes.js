const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/admin');
const managersController = require('../controllers/managers.controller');

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/', managersController.list);
router.post('/', managersController.create);
router.delete('/:userId', managersController.remove);

module.exports = router;

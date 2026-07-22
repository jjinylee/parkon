const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const whitelistController = require('../controllers/whitelist.controller');

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/', whitelistController.list);
router.post('/', whitelistController.create);
router.delete('/', whitelistController.remove);

module.exports = router;

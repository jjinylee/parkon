const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const usersController = require('../controllers/users.controller');

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', usersController.list);
router.get('/export', usersController.exportCSV);
router.put('/:id/status', usersController.updateStatus);

module.exports = router;

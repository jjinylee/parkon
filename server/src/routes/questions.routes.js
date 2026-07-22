const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const templatesController = require('../controllers/templates.controller');

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.put('/:id', templatesController.updateQuestion);
router.delete('/:id', templatesController.deleteQuestion);

module.exports = router;

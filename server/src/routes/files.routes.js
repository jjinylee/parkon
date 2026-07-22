const { Router } = require('express');
const authenticate = require('../middleware/auth');
const filesController = require('../controllers/files.controller');

const router = Router();
router.get('/:id/download', authenticate, filesController.download);

module.exports = router;

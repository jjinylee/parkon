const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const mailController = require('../controllers/mail.controller');

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/', mailController.list);
router.post('/', mailController.create);
router.put('/:id', mailController.update);
router.delete('/:id', mailController.remove);
router.post('/send', mailController.sendMail);
router.get('/logs/:applicationId', mailController.getMailLogs);

module.exports = router;

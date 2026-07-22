const { Router } = require('express');
const authenticate = require('../middleware/auth');
const mypageController = require('../controllers/mypage.controller');

const router = Router();
router.use(authenticate);

router.get('/', mypageController.get);
router.put('/', mypageController.update);

module.exports = router;

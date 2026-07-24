const { Router } = require('express');
const authenticate = require('../middleware/auth');
const authController = require('../controllers/auth.controller');
const usersController = require('../controllers/users.controller');

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post('/withdraw', authenticate, usersController.withdraw);

module.exports = router;

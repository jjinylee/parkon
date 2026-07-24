const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authenticate = require('../middleware/auth');
const authController = require('../controllers/auth.controller');
const usersController = require('../controllers/users.controller');

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' } },
});

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

router.post('/withdraw', authenticate, usersController.withdraw);
router.put('/password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;

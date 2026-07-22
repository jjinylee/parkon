const { Router } = require('express');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const managersRoutes = require('./managers.routes');
const templatesRoutes = require('./templates.routes');
const questionsRoutes = require('./questions.routes');
const applicationsRoutes = require('./applications.routes');
const whitelistRoutes = require('./whitelist.routes');
const mailRoutes = require('./mail.routes');
const statsRoutes = require('./stats.routes');
const mypageRoutes = require('./mypage.routes');
const configRoutes = require('./config.routes');
const filesRoutes = require('./files.routes');

const router = Router();

// Public routes (no auth needed)
router.use('/auth', authRoutes);

// Protected routes (auth required)
router.use('/users', usersRoutes);
router.use('/mypage', mypageRoutes);
router.use('/templates', templatesRoutes);
router.use('/questions', questionsRoutes);
router.use('/applications', applicationsRoutes);
router.use('/whitelist', whitelistRoutes);
router.use('/mail-templates', mailRoutes);
router.use('/stats', statsRoutes);
router.use('/admin/managers', managersRoutes);
router.use('/config', configRoutes);
router.use('/files', filesRoutes);

module.exports = router;

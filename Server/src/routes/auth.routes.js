const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, resetPassword, generateInviteToken, validateInviteToken } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.post('/generate-invite', protect, generateInviteToken);
router.get('/validate-invite-token', validateInviteToken);

module.exports = router;

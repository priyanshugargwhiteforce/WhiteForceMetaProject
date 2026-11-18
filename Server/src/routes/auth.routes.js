const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, verifyForgotPasswordCode, resetPassword, requestAdminPasswordChangeOtp, confirmAdminPasswordChange, generateInviteToken, validateInviteToken, getAdminInvites, revokeAdminInvite } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/forgot-password/verify', verifyForgotPasswordCode);
router.post('/reset-password/:token', resetPassword);

// Admin password change (verification code is emailed to IT support)
router.post('/change-password/request-otp', protect, authorize('admin'), requestAdminPasswordChangeOtp);
router.post('/change-password/confirm', protect, authorize('admin'), confirmAdminPasswordChange);

router.post('/generate-invite', protect, generateInviteToken);
router.get('/validate-invite-token', validateInviteToken);

// Admin Manager Registration Links (no time expiry, manual expire)
router.get('/invites', protect, authorize('admin'), getAdminInvites);
router.post('/invites/:id/revoke', protect, authorize('admin'), revokeAdminInvite);

module.exports = router;

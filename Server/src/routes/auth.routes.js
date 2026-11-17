const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, resetPassword, generateInviteToken, validateInviteToken, getAdminInvites, revokeAdminInvite } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.post('/generate-invite', protect, generateInviteToken);
router.get('/validate-invite-token', validateInviteToken);

// Admin Manager Registration Links (no time expiry, manual expire)
router.get('/invites', protect, authorize('admin'), getAdminInvites);
router.post('/invites/:id/revoke', protect, authorize('admin'), revokeAdminInvite);

module.exports = router;

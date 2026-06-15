const express = require('express');
const router = express.Router();
const { protect, authorizeLinkedin } = require('../../middlewares/auth.middleware');
const { 
    saveCreativeDraft, 
    publishCreative, 
    getCreativesList 
} = require('../../services/creativeBuilder.service');

// All endpoints in this file require authentication & LinkedIn access scope
router.use(protect);
router.use(authorizeLinkedin);

/**
 * POST /api/linkedin/creatives/draft
 * Create local creative draft (never calls LinkedIn API)
 */
router.post('/draft', async (req, res, next) => {
    try {
        const result = await saveCreativeDraft(req.body, req.user);
        res.status(201).json({
            success: true,
            message: 'Creative draft saved successfully.',
            data: result
        });
    } catch (error) {
        let errDetails = error.message;
        try {
            errDetails = JSON.parse(error.message);
        } catch (_) {}
        res.status(400).json({
            success: false,
            code: 'VALIDATION_FAILED',
            message: 'Please fix validation errors.',
            validationErrors: Array.isArray(errDetails) ? errDetails : [{ message: errDetails }]
        });
    }
});

/**
 * POST /api/linkedin/creatives/create
 * Validate & Publish creative to LinkedIn (or simulation mock)
 */
router.post('/create', async (req, res, next) => {
    try {
        const result = await publishCreative(req.body, req.user);
        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Creative created and published successfully.',
                data: result
            });
        } else {
            res.status(400).json({
                success: false,
                code: 'CREATIVE_FAILED',
                message: result.error || 'Ad Creative publishing failed.'
            });
        }
    } catch (error) {
        let errDetails = error.message;
        try {
            errDetails = JSON.parse(error.message);
        } catch (_) {}
        
        // Handle validation block response
        if (Array.isArray(errDetails)) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_FAILED',
                message: 'Please fix validation errors.',
                validationErrors: errDetails
            });
        }

        const isValidationMsg = error.message.includes('not registered') || error.message.includes('not found');
        res.status(isValidationMsg ? 400 : 500).json({
            success: false,
            code: isValidationMsg ? 'VALIDATION_FAILED' : 'PUBLISH_FAILED',
            message: error.message || 'Ad Creative publishing failed.'
        });
    }
});

/**
 * GET /api/linkedin/creatives
 * Retrieves list of all creatives matching selected account context
 */
router.get('/', async (req, res, next) => {
    try {
        const { accountId } = req.query;
        const result = await getCreativesList(accountId);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

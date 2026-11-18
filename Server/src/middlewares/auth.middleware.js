const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User no longer exists' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: `Account is ${user.status}. Access denied.` });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token is invalid' });
    }
};

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`
            });
        }
        next();
    };
};

const authorizeMeta = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.meta_access !== 1)) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have access to Meta Ads'
        });
    }
    next();
};

const authorizeMetaPublish = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.meta_publish !== 1)) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission to publish to Meta'
        });
    }
    next();
};

const authorizeGoogle = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.google_access !== 1)) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have access to Google Ads'
        });
    }
    next();
};

const authorizeWhatsapp = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.whatsapp_access !== 1)) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have access to WhatsApp Manager'
        });
    }
    next();
};

const authorizeLinkedin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.linkedin_access !== 1)) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have access to LinkedIn Ads'
        });
    }
    next();
};

const hasFlag = (user, flag) => Boolean(user) && (user[flag] === 1 || user[flag] === true);

// Reports: only Admin, or users the Admin has given Reports access
const authorizeReports = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && !hasFlag(req.user, 'reports_access'))) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have access to Reports. Please ask your Admin.'
        });
    }
    next();
};

// Media Library page actions that change the library (delete): Admin or Media Library access only
const authorizeMediaLibrary = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && !hasFlag(req.user, 'media_access'))) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have access to the Media Library. Please ask your Admin.'
        });
    }
    next();
};

// Browsing / uploading media is also needed by the media picker inside Meta Publish,
// LinkedIn and WhatsApp template builders, so those permissions keep working as before
const MEDIA_PICKER_FLAGS = ['media_access', 'meta_publish', 'linkedin_access', 'whatsapp_access'];
const authorizeMediaUse = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && !MEDIA_PICKER_FLAGS.some((f) => hasFlag(req.user, f)))) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have access to the Media Library. Please ask your Admin.'
        });
    }
    next();
};

module.exports = { 
    protect, 
    authorize,
    authorizeMeta,
    authorizeMetaPublish,
    authorizeGoogle,
    authorizeWhatsapp,
    authorizeLinkedin,
    authorizeReports,
    authorizeMediaLibrary,
    authorizeMediaUse
};

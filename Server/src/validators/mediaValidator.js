const path = require('path');

// Configure max file size boundaries (in bytes)
const getMaxSizeLimits = () => {
    const defaultImageLimit = 10 * 1024 * 1024;    // 10MB
    const defaultVideoLimit = 100 * 1024 * 1024;   // 100MB
    const defaultDocLimit = 50 * 1024 * 1024;      // 50MB
    const defaultOtherLimit = 20 * 1024 * 1024;    // 20MB

    const imageMb = process.env.MAX_IMAGE_SIZE_MB ? parseInt(process.env.MAX_IMAGE_SIZE_MB, 10) : null;
    const videoMb = process.env.MAX_VIDEO_SIZE_MB ? parseInt(process.env.MAX_VIDEO_SIZE_MB, 10) : null;
    const docMb = process.env.MAX_DOCUMENT_SIZE_MB ? parseInt(process.env.MAX_DOCUMENT_SIZE_MB, 10) : null;

    return {
        IMAGE: imageMb ? imageMb * 1024 * 1024 : defaultImageLimit,
        VIDEO: videoMb ? videoMb * 1024 * 1024 : defaultVideoLimit,
        DOCUMENT: docMb ? docMb * 1024 * 1024 : defaultDocLimit,
        LOGO: defaultImageLimit,
        BRAND: defaultImageLimit,
        OTHER: defaultOtherLimit
    };
};

const ALLOWED_MIME_TYPES = {
    // Images
    'image/jpeg': 'IMAGE',
    'image/jpg': 'IMAGE',
    'image/png': 'IMAGE',
    'image/webp': 'IMAGE',
    // Videos
    'video/mp4': 'VIDEO',
    'video/quicktime': 'VIDEO', // mov
    // Documents
    'application/pdf': 'DOCUMENT'
};

const ALLOWED_EXTENSIONS = {
    '.jpeg': 'IMAGE',
    '.jpg': 'IMAGE',
    '.png': 'IMAGE',
    '.webp': 'IMAGE',
    '.mp4': 'VIDEO',
    '.mov': 'VIDEO',
    '.pdf': 'DOCUMENT'
};

/**
 * Validate file metadata (MIME type, extension, and file size)
 * @param {object} file - The file object from Multer
 * @param {string} category - Expected category (IMAGE, VIDEO, DOCUMENT, LOGO, BRAND, OTHER)
 * @returns {object} { isValid, error, detectedType }
 */
const validateFile = (file, category = 'OTHER') => {
    if (!file) {
        return { isValid: false, error: 'No file provided' };
    }

    const { originalname, mimetype, size } = file;
    const ext = path.extname(originalname).toLowerCase();

    // 1. Validate MIME Type
    const mimeMappedType = ALLOWED_MIME_TYPES[mimetype];
    if (!mimeMappedType) {
        return { isValid: false, error: `Unsupported MIME type: ${mimetype}. Only JPEG, PNG, WEBP, MP4, MOV, and PDF are allowed.` };
    }

    // 2. Validate Extension
    const extMappedType = ALLOWED_EXTENSIONS[ext];
    if (!extMappedType) {
        return { isValid: false, error: `Unsupported file extension: ${ext}. Only .jpg, .jpeg, .png, .webp, .mp4, .mov, and .pdf are allowed.` };
    }

    // 3. Consistency Check (MIME type matches extension type)
    if (mimeMappedType !== extMappedType) {
        return { isValid: false, error: `MIME type (${mimetype}) and file extension (${ext}) mismatch.` };
    }

    // 4. Validate Size limits
    const limits = getMaxSizeLimits();
    const typeKey = mimeMappedType; // IMAGE, VIDEO, DOCUMENT
    const maxLimit = limits[category] || limits[typeKey] || limits.OTHER;

    if (size > maxLimit) {
        const maxLimitMb = (maxLimit / (1024 * 1024)).toFixed(1);
        return { 
            isValid: false, 
            error: `File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds the limit allowed for category ${category} (${maxLimitMb} MB).` 
        };
    }

    return { isValid: true, detectedType: typeKey };
};

module.exports = {
    validateFile,
    getMaxSizeLimits
};

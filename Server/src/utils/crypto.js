
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Encrypted values are stored as "<32 hex chars IV>:<hex ciphertext>"
const ENCRYPTED_FORMAT = /^[0-9a-f]{32}:[0-9a-f]+$/i;

// Key is derived from the server's JWT secret (ENCRYPTION_KEY only if explicitly set).
// NOTE: Changing JWT_SECRET will make previously stored tokens undecryptable.
const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-long-minimum-jwt-secret';
    // Must be 32 bytes for aes-256-cbc. Hash it to ensure exactly 32 bytes.
    return crypto.createHash('sha256').update(key).digest();
};

const isEncrypted = (text) => typeof text === 'string' && ENCRYPTED_FORMAT.test(text);

const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (text) => {
    if (!text) return null;
    // Legacy plain-text tokens (not in encrypted format) are returned unchanged
    if (!isEncrypted(text)) return text;
    try {
        const [ivHex, encryptedHex] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed, returning original text:', err.message);
        return text; // Return original on error to be safe with existing plain text tokens
    }
};

module.exports = {
    encrypt,
    decrypt,
    isEncrypted
};

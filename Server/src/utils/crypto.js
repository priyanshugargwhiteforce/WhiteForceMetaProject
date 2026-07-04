const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-long-minimum-jwt-secret';
    // Must be 32 bytes for aes-256-cbc. Hash it to ensure exactly 32 bytes.
    return crypto.createHash('sha256').update(key).digest();
};

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
    try {
        const parts = text.split(':');
        if (parts.length !== 2) return text; // If not encrypted or in different format, fallback to original (e.g. legacy plain text tokens)
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');
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
    decrypt
};

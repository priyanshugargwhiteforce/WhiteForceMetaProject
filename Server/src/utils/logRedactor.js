const util = require('util');

/**
 * Central log redaction: strips Meta/WhatsApp access tokens, Bearer tokens and
 * URL token params from anything written to the console (PM2 logs) or log files.
 */
const REDACTIONS = [
    [/(access_token=)[^&\s"'\\]+/gi, '$1[REDACTED]'],
    [/(input_token=)[^&\s"'\\]+/gi, '$1[REDACTED]'],
    [/([?&]token=)[^&\s"'\\]+/gi, '$1[REDACTED]'],
    [/(Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/g, '$1[REDACTED]'],
    [/\bEAA[A-Za-z0-9]{20,}/g, '[REDACTED_META_TOKEN]'],
];

// Quick pre-check so normal logs are printed exactly as before
const SENSITIVE_HINT = /access_token=|input_token=|[?&]token=|Bearer\s|EAA[A-Za-z0-9]{20,}/i;

const redact = (text) => {
    if (typeof text !== 'string' || !SENSITIVE_HINT.test(text)) return text;
    return REDACTIONS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
};

let installed = false;

const installConsoleRedaction = () => {
    if (installed) return;
    installed = true;
    for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
        const original = console[method].bind(console);
        console[method] = (...args) => {
            let formatted;
            try {
                formatted = util.format(...args);
            } catch (e) {
                return original(...args);
            }
            if (!SENSITIVE_HINT.test(formatted)) return original(...args);
            return original(redact(formatted));
        };
    }
};

module.exports = { redact, installConsoleRedaction };

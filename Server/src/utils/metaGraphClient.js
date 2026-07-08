const axios = require('axios');
const crypto = require('crypto');

const getMetaGraphVersion = () => process.env.META_GRAPH_VERSION || 'v25.0';

/**
 * Scrubs any access tokens from string logs
 */
const scrubToken = (str) => {
    if (!str) return str;
    // Replace access token parameter values (e.g. access_token=EAAC...)
    return str.replace(/(access_token=)[a-zA-Z0-9_-]+/g, '$1[SCRUBBED]')
              .replace(/(Bearer\s+)[a-zA-Z0-9_-]+/g, '$1[SCRUBBED]');
};

/**
 * Calculates appsecret_proof for server-to-server Graph API requests
 */
const getAppSecretProof = (accessToken) => {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret || !accessToken) return null;
    return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
};

/**
 * Centralized Meta Graph API Axios helper
 */
const metaRequest = async (method, path, data = null, params = {}, headers = {}, options = {}) => {
    const version = getMetaGraphVersion();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `https://graph.facebook.com/${version}${cleanPath}`;

    const accessToken = params.access_token || (data && data.access_token) || headers['Authorization']?.split(' ')[1];
    
    // Automatically add appsecret_proof if token is available
    if (accessToken) {
        const proof = getAppSecretProof(accessToken);
        if (proof) {
            params.appsecret_proof = proof;
        }
    }

    const config = {
        method: method.toUpperCase(),
        url,
        params: { ...params },
        headers: { ...headers },
        timeout: options.timeout || 15000,
        ...options
    };

    if (data) {
        config.data = data;
    }

    try {
        console.log(`[Meta API Request] ${config.method} ${scrubToken(url)}`);
        const response = await axios(config);
        return response.data;
    } catch (error) {
        // Scrub error request config and response details
        if (error.config) {
            error.config.url = scrubToken(error.config.url);
            if (error.config.params && error.config.params.access_token) {
                error.config.params.access_token = '[SCRUBBED]';
            }
            if (error.config.headers && error.config.headers['Authorization']) {
                error.config.headers['Authorization'] = 'Bearer [SCRUBBED]';
            }
        }

        const metaError = error.response?.data?.error;
        let errMsg = error.message;
        let code = null;
        let subcode = null;
        let traceId = error.response?.headers?.['x-fb-trace-id'] || metaError?.fbtrace_id || null;

        if (metaError) {
            code = metaError.code;
            subcode = metaError.error_subcode;
            errMsg = metaError.message || errMsg;
            
            // Clean sensitive trace fields
            if (metaError.message) {
                metaError.message = scrubToken(metaError.message);
            }
        }

        console.error(`[Meta API Error] ${config.method} ${scrubToken(url)} failed:`, scrubToken(errMsg));

        const parsedError = new Error(errMsg);
        parsedError.code = code;
        parsedError.subcode = subcode;
        parsedError.traceId = traceId;
        parsedError.response = error.response ? { data: error.response.data } : null;
        parsedError.isRetryable = isErrorRetryable(code, subcode, error);

        throw parsedError;
    }
};

/**
 * Classifies if a Meta Graph API error is temporary / retryable
 */
const isErrorRetryable = (code, subcode, error) => {
    // Non-retryable: validation, permissions, rate quota exhausted
    // Temporary: network timeout, rate limit server overload (code 1, 2, 4, 17, 368)
    if (code === 1 || code === 2 || code === 4 || code === 17 || code === 368) {
        return true;
    }
    // Network/HTTP timeouts
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return true;
    }
    return false;
};

module.exports = {
    metaRequest,
    isErrorRetryable,
    scrubToken,
    getMetaGraphVersion
};

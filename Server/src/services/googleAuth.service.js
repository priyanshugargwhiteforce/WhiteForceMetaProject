const axios = require('axios');
const jwt = require('jsonwebtoken');
const GoogleAccount = require('../models/googleAccount.model');

const getOAuthCredentials = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:8000/api/google/auth/callback';

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET) are missing in environment variables.');
    }

    return { clientId, clientSecret, redirectUri };
};

/**
 * Generate a signed state token for CSRF protection tied to the initiating user
 */
const generateOAuthState = (userId) => {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    return jwt.sign(
        { userId, nonce: Math.random().toString(36).substring(2) },
        secret,
        { expiresIn: '15m' }
    );
};

/**
 * Verify and decode the OAuth state token
 */
const verifyOAuthState = (state) => {
    try {
        const secret = process.env.JWT_SECRET || 'fallback_secret';
        const decoded = jwt.verify(state, secret);
        return decoded;
    } catch (err) {
        throw new Error('Invalid or expired OAuth state token. Please restart authentication.');
    }
};

/**
 * Generate Google OAuth 2.0 authorization login URL
 */
const getAuthUrl = (state) => {
    const { clientId, redirectUri } = getOAuthCredentials();

    const scopes = [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly'
    ];

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline',
        prompt: 'select_account consent',
        state: state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange authorization code for Google access & refresh tokens
 */
const exchangeCodeForTokens = async (code) => {
    const { clientId, clientSecret, redirectUri } = getOAuthCredentials();

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        return response.data;
    } catch (err) {
        const errorMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
        throw new Error(`Google token exchange failed: ${errorMsg}`);
    }
};

/**
 * Fetch Google User Profile Info using access token
 */
const getGoogleUserInfo = async (accessToken) => {
    try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return response.data; // { sub, name, given_name, family_name, picture, email, email_verified }
    } catch (err) {
        const errorMsg = err.response?.data?.error_description || err.message;
        throw new Error(`Failed to fetch Google user profile: ${errorMsg}`);
    }
};

/**
 * Refresh an expired Google Access Token using stored Refresh Token
 */
const refreshAccessToken = async (refreshToken) => {
    const { clientId, clientSecret } = getOAuthCredentials();

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        return response.data; // { access_token, expires_in, scope, token_type }
    } catch (err) {
        const errorMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
        if (errorMsg.includes('invalid_grant') || errorMsg.includes('revoked')) {
            const error = new Error('Google authorization has been revoked or expired. Re-authentication required.');
            error.code = 'ERR_REVOKED';
            throw error;
        }
        throw new Error(`Token refresh failed: ${errorMsg}`);
    }
};

/**
 * Get a valid access token for a connected Google account, refreshing if necessary
 */
const getValidAccessToken = async (accountId) => {
    const account = await GoogleAccount.findByIdWithTokens(accountId);
    if (!account) {
        throw new Error(`Google Account record ${accountId} not found.`);
    }

    if (account.status === 'revoked') {
        throw new Error('Google Account connection is revoked. Please reconnect account.');
    }

    const now = new Date();
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

    // Check if token is still valid (with 60-second buffer)
    if (account.access_token && expiresAt && (expiresAt.getTime() - now.getTime() > 60000)) {
        return account.access_token;
    }

    // Refresh token if expired
    if (!account.refresh_token) {
        throw new Error('No refresh token available for this Google Account.');
    }

    try {
        console.log(`[Google OAuth] Refreshing expired access token for ${account.email}...`);
        const tokenData = await refreshAccessToken(account.refresh_token);

        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
        await GoogleAccount.updateTokens(account.id, {
            access_token: tokenData.access_token,
            token_expires_at: newExpiresAt,
            status: 'active'
        });

        return tokenData.access_token;
    } catch (err) {
        if (err.code === 'ERR_REVOKED') {
            await GoogleAccount.updateStatus(account.id, 'revoked');
        }
        throw err;
    }
};

module.exports = {
    getOAuthCredentials,
    generateOAuthState,
    verifyOAuthState,
    getAuthUrl,
    exchangeCodeForTokens,
    getGoogleUserInfo,
    refreshAccessToken,
    getValidAccessToken
};

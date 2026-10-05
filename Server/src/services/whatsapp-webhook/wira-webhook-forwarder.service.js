const axios = require('axios');

/**
 * Forward reconstructed Meta payload to WIRA WhatsApp chatbot local service.
 */
async function forwardToWira(payload) {
    const wiraUrl = process.env.WIRA_INTERNAL_WEBHOOK_URL || 'http://127.0.0.1:8001/api/whatsapp/webhook';
    const secret = process.env.WIRA_INTERNAL_SECRET;

    const headers = {
        'Content-Type': 'application/json'
    };

    if (secret) {
        headers['X-Wira-Internal-Secret'] = secret;
    }

    try {
        console.log(`[WIRA Forwarder] Forwarding webhook payload to local chatbot at ${wiraUrl}...`);
        
        const response = await axios.post(wiraUrl, payload, {
            headers,
            timeout: 5000 // 5 seconds short timeout
        });

        console.log(`[WIRA Forwarder] Successfully forwarded to WIRA. Status: ${response.status}`);
        return true;
    } catch (error) {
        // Log forwarding failure without exposing customer message content
        console.error('[WIRA Forwarder] Failed to forward webhook payload to WIRA:', error.message);
        if (error.response) {
            console.error(`[WIRA Forwarder] WIRA responded with status: ${error.response.status}`);
        }
        throw error; // Propagate to trigger 500 error on the main controller
    }
}

module.exports = { forwardToWira };

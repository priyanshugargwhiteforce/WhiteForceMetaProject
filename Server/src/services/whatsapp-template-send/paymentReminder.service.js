const axios = require('axios');
const { pool } = require('../../config/db');
const { resolveWhatsAppConfig } = require('../whatsapp.service');
const { cleanPhoneNumber } = require('../dailyTaskReminder.service');

const TEMPLATE_NAME = 'payment_reminder';
const TEMPLATE_LANGUAGE = 'en';
const META_API_TIMEOUT_MS = 10000;

/**
 * Sends the approved 'payment_reminder' WhatsApp template with a PDF header document
 * and 6 positional body variables.
 *
 * @param {Object} options
 * @param {string} options.recipient_phone - Destination phone number
 * @param {string} options.pdf_url - Public HTTPS URL of the invoice PDF
 * @param {string} [options.pdf_filename] - Optional display filename for the PDF attachment
 * @param {string} options.customer_name - {{1}} Recipient/Customer full name
 * @param {string} options.payroll_month - {{2}} Payroll month (e.g. 'July')
 * @param {string} options.invoice_date - {{3}} Invoice issue date (e.g. '02-04-2026')
 * @param {string} options.invoice_number - {{4}} Invoice identifier (e.g. 'WF-2-24-26')
 * @param {string|number} options.invoice_amount - {{5}} Total invoice amount (e.g. '12345')
 * @param {string|number} options.pending_amount - {{6}} Outstanding pending amount (e.g. '1234')
 * @param {string} [options.source_app] - Name of external system (e.g. 'billing_app')
 * @param {string} [options.source_user_id] - User identifier in calling system
 * @param {string} [options.source_user_name] - User name in calling system
 * @param {string} [options.source_reference_id] - Unique invoice or transaction ID for idempotency
 * @param {number|null} [options.config_id] - Specific WhatsApp config ID if multi-tenant
 * @returns {Promise<Object>} Delivery result object
 */
async function sendPaymentReminder({
    recipient_phone,
    pdf_url,
    pdf_filename,
    customer_name,
    payroll_month,
    invoice_date,
    invoice_number,
    invoice_amount,
    pending_amount,
    source_app = 'external_system',
    source_user_id = null,
    source_user_name = null,
    source_reference_id = null,
    config_id = null
}) {
    // 1. Sanitize & Validate Destination Phone
    const targetPhone = cleanPhoneNumber(recipient_phone);
    if (!targetPhone || targetPhone.length < 10) {
        throw new Error(`Invalid recipient phone number: "${recipient_phone}". Must be a valid phone number.`);
    }

    // 2. Validate PDF URL
    if (!pdf_url || typeof pdf_url !== 'string' || !/^https?:\/\//i.test(pdf_url)) {
        throw new Error('Valid HTTP/HTTPS pdf_url is required for the template header document.');
    }

    // 3. Validate Required Body Variables
    if (!customer_name) throw new Error('customer_name is required for variable {{1}}');
    if (!payroll_month) throw new Error('payroll_month is required for variable {{2}}');
    if (!invoice_date) throw new Error('invoice_date is required for variable {{3}}');
    if (!invoice_number) throw new Error('invoice_number is required for variable {{4}}');
    if (invoice_amount === undefined || invoice_amount === null || invoice_amount === '') {
        throw new Error('invoice_amount is required for variable {{5}}');
    }
    if (pending_amount === undefined || pending_amount === null || pending_amount === '') {
        throw new Error('pending_amount is required for variable {{6}}');
    }

    const referenceId = source_reference_id ? String(source_reference_id).trim() : String(invoice_number).trim();

    // 4. Duplicate Check (Idempotency Window: 15 minutes)
    if (referenceId) {
        try {
            const [[recentLog]] = await pool.query(
                `SELECT id, message_id, status, sent_at FROM whatsapp_message_logs 
                 WHERE recipient_number = ? 
                   AND template_name = ? 
                   AND source_reference_id = ?
                   AND status IN ('sent', 'delivered', 'read')
                   AND sent_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
                 ORDER BY id DESC LIMIT 1`,
                [targetPhone, TEMPLATE_NAME, referenceId]
            );

            if (recentLog) {
                console.log(`[Payment Reminder] Duplicate request detected for ${targetPhone} and Ref: ${referenceId}. Skipping send.`);
                return {
                    success: true,
                    status: 'duplicate_skipped',
                    message: 'Payment reminder was already accepted/sent recently for this invoice.',
                    data: {
                        message_id: recentLog.message_id,
                        recipient: targetPhone,
                        template_name: TEMPLATE_NAME,
                        source_reference_id: referenceId,
                        sent_at: recentLog.sent_at
                    }
                };
            }
        } catch (dbErr) {
            console.warn('[Payment Reminder] Idempotency check DB query error:', dbErr.message);
        }
    }

    // 5. Resolve Active WhatsApp Credentials
    const { token, phoneId } = await resolveWhatsAppConfig(config_id);
    if (!token || !phoneId) {
        throw new Error('WhatsApp integration credentials (access token or phone ID) are not configured.');
    }

    // 6. Build Document Filename
    let derivedFilename = pdf_filename;
    if (!derivedFilename) {
        const sanitizedInv = String(invoice_number).replace(/[^a-zA-Z0-9_-]/g, '_');
        derivedFilename = `Invoice_${sanitizedInv}.pdf`;
    }

    // 7. Construct Meta Cloud API Payload
    const components = [
        {
            type: 'header',
            parameters: [
                {
                    type: 'document',
                    document: {
                        link: String(pdf_url).trim(),
                        filename: derivedFilename
                    }
                }
            ]
        },
        {
            type: 'body',
            parameters: [
                { type: 'text', text: String(customer_name).trim() },
                { type: 'text', text: String(payroll_month).trim() },
                { type: 'text', text: String(invoice_date).trim() },
                { type: 'text', text: String(invoice_number).trim() },
                { type: 'text', text: String(invoice_amount).trim() },
                { type: 'text', text: String(pending_amount).trim() }
            ]
        }
    ];

    const payload = {
        messaging_product: 'whatsapp',
        to: targetPhone,
        type: 'template',
        template: {
            name: TEMPLATE_NAME,
            language: { code: TEMPLATE_LANGUAGE },
            components
        }
    };

    const paramsObj = {
        '1': String(customer_name).trim(),
        '2': String(payroll_month).trim(),
        '3': String(invoice_date).trim(),
        '4': String(invoice_number).trim(),
        '5': String(invoice_amount).trim(),
        '6': String(pending_amount).trim(),
        header_document_url: String(pdf_url).trim()
    };

    // 8. Dispatch HTTP Request to Meta Graph API v24.0
    let metaResponse;
    try {
        const url = `https://graph.facebook.com/v24.0/${phoneId}/messages`;
        metaResponse = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: META_API_TIMEOUT_MS
        });
    } catch (apiErr) {
        const errorDetails = apiErr.response?.data?.error || { message: apiErr.message };
        const errorMessage = errorDetails.message || apiErr.message;
        console.error('[Payment Reminder Error] Meta API rejected message dispatch:', errorDetails);

        // Record failure in audit log
        try {
            await pool.query(
                `INSERT INTO whatsapp_message_logs 
                 (phone_number_id, recipient_number, template_name, status, message_id, error_message,
                  source_app, source_user_id, source_user_name, source_reference_id, message_type, direction,
                  template_language, template_params_json, meta_response_json)
                 VALUES (?, ?, ?, 'failed', NULL, ?, ?, ?, ?, ?, 'template', 'outgoing', ?, ?, ?)`,
                [
                    phoneId,
                    targetPhone,
                    TEMPLATE_NAME,
                    errorMessage,
                    source_app,
                    source_user_id,
                    source_user_name,
                    referenceId,
                    TEMPLATE_LANGUAGE,
                    JSON.stringify(paramsObj),
                    JSON.stringify(apiErr.response?.data || { error: apiErr.message })
                ]
            );
        } catch (logErr) {
            console.error('[Payment Reminder] Failed to log rejected message attempt:', logErr.message);
        }

        const formattedError = new Error(`Meta Cloud API Error: ${errorMessage}`);
        formattedError.metaError = errorDetails;
        formattedError.statusCode = apiErr.response?.status || 502;
        throw formattedError;
    }

    const messageId = metaResponse.data?.messages?.[0]?.id;
    if (!messageId) {
        throw new Error('Meta API returned 200 OK but message ID was missing from response.');
    }

    // 9. Audit Logging in whatsapp_message_logs
    try {
        await pool.query(
            `INSERT INTO whatsapp_message_logs 
             (phone_number_id, recipient_number, template_name, status, message_id, sent_by, error_message,
              source_app, source_user_id, source_user_name, source_reference_id, message_type, direction,
              template_language, template_params_json, meta_response_json)
             VALUES (?, ?, ?, 'sent', ?, NULL, NULL, ?, ?, ?, ?, 'template', 'outgoing', ?, ?, ?)`,
            [
                phoneId,
                targetPhone,
                TEMPLATE_NAME,
                messageId,
                source_app,
                source_user_id,
                source_user_name,
                referenceId,
                TEMPLATE_LANGUAGE,
                JSON.stringify(paramsObj),
                JSON.stringify(metaResponse.data)
            ]
        );
    } catch (logErr) {
        console.error(`[CRITICAL_LOG_FALLBACK] Payment Reminder sent (${messageId}) but DB log failed:`, logErr.message);
    }

    console.log(`✅ [Payment Reminder] Successfully accepted by Meta for "${customer_name}" (${targetPhone}). Message ID: ${messageId}`);

    return {
        success: true,
        status: 'accepted',
        message: 'Payment reminder accepted by Meta Cloud API.',
        data: {
            message_id: messageId,
            recipient: targetPhone,
            template_name: TEMPLATE_NAME,
            source_reference_id: referenceId
        }
    };
}

module.exports = {
    sendPaymentReminder,
    TEMPLATE_NAME,
    TEMPLATE_LANGUAGE
};

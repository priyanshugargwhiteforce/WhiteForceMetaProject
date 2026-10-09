const {
    sendPaymentReminder,
    sendOverduePaymentReminder
} = require('../../services/whatsapp-template-send');

/**
 * Validates common fields for payment reminder requests
 */
function validateBaseFields(body) {
    const errors = [];
    if (!body.recipient_phone) errors.push('recipient_phone is required');
    if (!body.pdf_url) errors.push('pdf_url is required');
    else if (!/^https?:\/\//i.test(body.pdf_url)) errors.push('pdf_url must be a valid HTTP or HTTPS URL');

    if (!body.customer_name) errors.push('customer_name is required');
    if (!body.payroll_month) errors.push('payroll_month is required');
    if (!body.invoice_date) errors.push('invoice_date is required');
    if (!body.invoice_number) errors.push('invoice_number is required');
    if (body.invoice_amount === undefined || body.invoice_amount === null || body.invoice_amount === '') {
        errors.push('invoice_amount is required');
    }
    if (body.pending_amount === undefined || body.pending_amount === null || body.pending_amount === '') {
        errors.push('pending_amount is required');
    }
    return errors;
}

/**
 * Controller: POST /api/whatsapp/send-payment-reminder
 */
exports.sendPaymentReminder = async (req, res) => {
    try {
        const body = req.body || {};
        const validationErrors = validateBaseFields(body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${validationErrors.join(', ')}`,
                errors: validationErrors
            });
        }

        const sourceApp = body.source_app || req.query.source_app || 'external_system';
        const configId = req.headers['x-whatsapp-config-id'] || body.config_id || null;

        const result = await sendPaymentReminder({
            recipient_phone: body.recipient_phone,
            pdf_url: body.pdf_url,
            pdf_filename: body.pdf_filename,
            customer_name: body.customer_name,
            payroll_month: body.payroll_month,
            invoice_date: body.invoice_date,
            invoice_number: body.invoice_number,
            invoice_amount: body.invoice_amount,
            pending_amount: body.pending_amount,
            source_app: sourceApp,
            source_user_id: body.source_user_id || null,
            source_user_name: body.source_user_name || null,
            source_reference_id: body.source_reference_id || body.invoice_number || null,
            config_id: configId
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Send Payment Reminder Controller Error:', error.message);
        const statusCode = error.statusCode || (error.message.includes('Invalid') ? 400 : 500);
        return res.status(statusCode).json({
            success: false,
            message: error.message,
            metaError: error.metaError || null
        });
    }
};

/**
 * Controller: POST /api/whatsapp/send-overdue-payment-reminder
 */
exports.sendOverduePaymentReminder = async (req, res) => {
    try {
        const body = req.body || {};
        const validationErrors = validateBaseFields(body);

        if (!body.payment_due_date) validationErrors.push('payment_due_date is required');
        if (body.overdue_by_days === undefined || body.overdue_by_days === null || body.overdue_by_days === '') {
            validationErrors.push('overdue_by_days is required');
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${validationErrors.join(', ')}`,
                errors: validationErrors
            });
        }

        const sourceApp = body.source_app || req.query.source_app || 'external_system';
        const configId = req.headers['x-whatsapp-config-id'] || body.config_id || null;

        const result = await sendOverduePaymentReminder({
            recipient_phone: body.recipient_phone,
            pdf_url: body.pdf_url,
            pdf_filename: body.pdf_filename,
            customer_name: body.customer_name,
            payroll_month: body.payroll_month,
            invoice_date: body.invoice_date,
            invoice_number: body.invoice_number,
            invoice_amount: body.invoice_amount,
            pending_amount: body.pending_amount,
            payment_due_date: body.payment_due_date,
            overdue_by_days: body.overdue_by_days,
            source_app: sourceApp,
            source_user_id: body.source_user_id || null,
            source_user_name: body.source_user_name || null,
            source_reference_id: body.source_reference_id || body.invoice_number || null,
            config_id: configId
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Send Overdue Payment Reminder Controller Error:', error.message);
        const statusCode = error.statusCode || (error.message.includes('Invalid') ? 400 : 500);
        return res.status(statusCode).json({
            success: false,
            message: error.message,
            metaError: error.metaError || null
        });
    }
};

const whatsappCallsService = require('../../services/whatsapp-calls.service');

/**
 * Controller to fetch paginated call logs with filters and summary KPIs.
 * GET /api/whatsapp/calls
 */
exports.getCallLogs = async (req, res) => {
    try {
        const {
            page,
            limit,
            search,
            event,
            direction,
            startDate,
            endDate,
            phoneId
        } = req.query;

        const configId = req.headers['x-whatsapp-config-id'] || req.query.configId;

        const result = await whatsappCallsService.getCallLogs({
            page,
            limit,
            search,
            event,
            direction,
            startDate,
            endDate,
            phoneId: phoneId || configId
        });

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[WhatsApp Calls Controller] getCallLogs error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch call logs'
        });
    }
};

/**
 * Controller to fetch single call details.
 * GET /api/whatsapp/calls/:id
 */
exports.getCallDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const call = await whatsappCallsService.getCallDetails(id);

        if (!call) {
            return res.status(404).json({
                success: false,
                message: 'Call log not found'
            });
        }

        return res.status(200).json({
            success: true,
            call
        });
    } catch (error) {
        console.error('[WhatsApp Calls Controller] getCallDetails error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch call details'
        });
    }
};

/**
 * Controller to delete a call log record.
 * DELETE /api/whatsapp/calls/:id
 */
exports.deleteCallLog = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await whatsappCallsService.deleteCallLog(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Call log record not found or already deleted'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Call log deleted successfully'
        });
    } catch (error) {
        console.error('[WhatsApp Calls Controller] deleteCallLog error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete call log'
        });
    }
};

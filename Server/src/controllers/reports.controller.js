const reportsService = require('../services/reports.service');

/**
 * Utility to parse preset range into YYYY-MM-DD format.
 */
function parseDateRange(range, startDate, endDate) {
    const now = new Date();
    // Helper to get offset string in YYYY-MM-DD (handling local timezone offsets correctly)
    const formatLocalDate = (date) => {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
    };

    let startStr, endStr;

    switch (range) {
        case 'today': {
            const todayStr = formatLocalDate(now);
            startStr = todayStr;
            endStr = todayStr;
            break;
        }
        case 'week': {
            // Get current week Monday
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now.setDate(diff));
            startStr = formatLocalDate(monday);
            endStr = formatLocalDate(new Date());
            break;
        }
        case 'month': {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            startStr = formatLocalDate(firstDay);
            endStr = formatLocalDate(new Date());
            break;
        }
        case 'custom': {
            if (startDate && endDate) {
                startStr = startDate;
                endStr = endDate;
            } else {
                // fallback to month
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                startStr = formatLocalDate(firstDay);
                endStr = formatLocalDate(new Date());
            }
            break;
        }
        default: {
            // default to month
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            startStr = formatLocalDate(firstDay);
            endStr = formatLocalDate(new Date());
        }
    }
    return { startStr, endStr };
}

/**
 * GET spend report metrics & history
 */
exports.getSpendReport = async (req, res) => {
    try {
        const { range = 'month', startDate, endDate } = req.query;
        const { startStr, endStr } = parseDateRange(range, startDate, endDate);

        console.log(`[Reports] Querying spend data from ${startStr} to ${endStr} (range: ${range})`);

        const data = await reportsService.getSpendReportData(startStr, endStr);

        res.json({
            success: true,
            range,
            startDate: startStr,
            endDate: endStr,
            data
        });
    } catch (error) {
        console.error('getSpendReport Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * POST trigger real-time spend sync from APIs for the date range
 */
exports.syncSpendReport = async (req, res) => {
    try {
        const { range = 'month', startDate, endDate } = req.body;
        const { startStr, endStr } = parseDateRange(range, startDate, endDate);

        console.log(`[Reports] Triggering live sync from ${startStr} to ${endStr} (range: ${range})`);

        const syncResults = await reportsService.syncAllSpendData(startStr, endStr);

        res.json({
            success: true,
            range,
            startDate: startStr,
            endDate: endStr,
            syncResults
        });
    } catch (error) {
        console.error('syncSpendReport Controller Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

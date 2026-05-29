const { pool } = require('../../config/db');

// Helper to format Date objects as YYYY-MM-DD in local time
const formatDateString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// @desc    Get all WhatsApp channels with summary metrics (current count, growth, today status)
// @route   GET /api/whatsapp/channels
// @access  Private
exports.getChannels = async (req, res) => {
    try {
        // 1. Get all channel profiles
        const [channels] = await pool.query('SELECT * FROM whatsapp_channels ORDER BY created_at DESC');
        
        if (channels.length === 0) {
            return res.json({
                success: true,
                channels: []
            });
        }

        // 2. Get all membership updates to calculate growth and stats in-memory (O(N+M))
        const [updates] = await pool.query('SELECT * FROM whatsapp_channel_member_updates ORDER BY update_date ASC');

        // Today's date string in YYYY-MM-DD
        const todayStr = formatDateString(new Date());

        const channelsWithStats = channels.map(channel => {
            const channelUpdates = updates.filter(u => u.channel_id === channel.id);
            
            // Calculate total members (sum of all daily updates)
            const totalSum = channelUpdates.reduce((sum, u) => sum + u.member_count, 0);

            // Get the most recent update entry (chronologically last)
            const latestUpdate = channelUpdates[channelUpdates.length - 1];

            const latestCount = totalSum;
            const initialCount = channelUpdates[0] ? channelUpdates[0].member_count : 0;
            // total_growth is the count logged on the latest date (not the sum)
            const totalGrowth = latestUpdate ? latestUpdate.member_count : 0;

            const updatedToday = channelUpdates.some(u => formatDateString(u.update_date) === todayStr);

            return {
                id: channel.id,
                channel_name: channel.channel_name,
                manager_name: channel.manager_name,
                created_at: channel.created_at,
                latest_member_count: latestCount,
                initial_member_count: initialCount,
                total_growth: totalGrowth,
                updated_today: updatedToday,
                updates_count: channelUpdates.length,
                updates: channelUpdates.map(u => ({
                    id: u.id,
                    member_count: u.member_count,
                    update_date: formatDateString(u.update_date)
                }))
            };
        });

        res.json({
            success: true,
            channels: channelsWithStats
        });
    } catch (error) {
        console.error("Error fetching whatsapp channels:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create a new WhatsApp channel profile
// @route   POST /api/whatsapp/channels
// @access  Private
exports.createChannel = async (req, res) => {
    try {
        const { channel_name, manager_name } = req.body;

        if (!channel_name || !manager_name) {
            return res.status(400).json({
                success: false,
                message: "Channel Name and Manager Name are required."
            });
        }

        const [result] = await pool.query(
            'INSERT INTO whatsapp_channels (channel_name, manager_name) VALUES (?, ?)',
            [channel_name.trim(), manager_name.trim()]
        );

        res.status(201).json({
            success: true,
            message: "WhatsApp Channel profile created successfully",
            channel: {
                id: result.insertId,
                channel_name,
                manager_name,
                latest_member_count: 0,
                total_growth: 0,
                updated_today: false
            }
        });
    } catch (error) {
        console.error("Error creating whatsapp channel:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete a WhatsApp channel profile and its update history
// @route   DELETE /api/whatsapp/channels/:id
// @access  Private
exports.deleteChannel = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query('DELETE FROM whatsapp_channels WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "WhatsApp Channel not found"
            });
        }

        res.json({
            success: true,
            message: "WhatsApp Channel and its daily log history deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting whatsapp channel:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get complete daily updates history for a specific WhatsApp channel
// @route   GET /api/whatsapp/channels/:id/history
// @access  Private
exports.getChannelHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get channel profile first
        const [channels] = await pool.query('SELECT * FROM whatsapp_channels WHERE id = ?', [id]);
        
        if (channels.length === 0) {
            return res.status(404).json({
                success: false,
                message: "WhatsApp Channel not found"
            });
        }

        // 2. Get updates history ordered by date descending
        const [history] = await pool.query(
            'SELECT id, member_count, update_date, created_at FROM whatsapp_channel_member_updates WHERE channel_id = ? ORDER BY update_date DESC',
            [id]
        );

        // Format dates consistently
        const formattedHistory = history.map(item => ({
            id: item.id,
            member_count: item.member_count,
            update_date: formatDateString(item.update_date),
            created_at: item.created_at
        }));

        res.json({
            success: true,
            channel: channels[0],
            history: formattedHistory
        });
    } catch (error) {
        console.error("Error fetching channel history:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Add or update the daily member count for a specific WhatsApp channel
// @route   POST /api/whatsapp/channels/:id/updates
// @access  Private
exports.addOrUpdateDailyCount = async (req, res) => {
    try {
        const { id } = req.params;
        const { member_count, update_date } = req.body;

        if (member_count === undefined || member_count === null || isNaN(member_count)) {
            return res.status(400).json({
                success: false,
                message: "A valid member count is required."
            });
        }

        const count = parseInt(member_count, 10);
        if (count < 0) {
            return res.status(400).json({
                success: false,
                message: "Member count cannot be negative."
            });
        }

        // Default to today's date formatted as YYYY-MM-DD if not provided
        const dateStr = update_date ? formatDateString(update_date) : formatDateString(new Date());

        // 1. Verify channel exists
        const [channels] = await pool.query('SELECT * FROM whatsapp_channels WHERE id = ?', [id]);
        if (channels.length === 0) {
            return res.status(404).json({
                success: false,
                message: "WhatsApp Channel not found"
            });
        }

        // 2. Perform UPSERT using INSERT ... ON DUPLICATE KEY UPDATE
        await pool.query(
            `INSERT INTO whatsapp_channel_member_updates (channel_id, member_count, update_date) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE member_count = VALUES(member_count)`,
            [id, count, dateStr]
        );

        res.json({
            success: true,
            message: `Member count of ${count} for date ${dateStr} saved successfully.`
        });
    } catch (error) {
        console.error("Error saving member count update:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete a specific daily member count log entry
// @route   DELETE /api/whatsapp/channels/updates/:updateId
// @access  Private
exports.deleteDailyCount = async (req, res) => {
    try {
        const { updateId } = req.params;

        const [result] = await pool.query('DELETE FROM whatsapp_channel_member_updates WHERE id = ?', [updateId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Log entry not found"
            });
        }

        res.json({
            success: true,
            message: "Daily count entry deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting daily update entry:", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

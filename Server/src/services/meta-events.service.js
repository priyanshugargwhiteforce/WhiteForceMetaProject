let clients = [];

// Periodic ping to keep SSE connections alive
setInterval(() => {
    if (clients.length > 0) {
        clients.forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify({ type: 'ping', data: { time: new Date().toISOString() } })}\n\n`);
            } catch (err) {
                console.error(`[Meta SSE Ping Error] client ${client.id}:`, err.message);
            }
        });
    }
}, 30000);

/**
 * Register a new Server-Sent Events client under a specific user session
 */
const addClient = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx
    res.flushHeaders(); // Establish the connection stream

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        userId: req.user.id,
        res
    };

    clients.push(newClient);
    console.log(`[Meta SSE] Client ${clientId} connected for User ${req.user.id}. Total clients: ${clients.length}`);

    // Send initial ping to establish connection
    res.write(`data: ${JSON.stringify({ type: 'ping', data: { status: 'connected', userId: req.user.id } })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`[Meta SSE] Client ${clientId} disconnected. Total clients: ${clients.length}`);
    });
};

/**
 * Broadcast an event to clients belonging to the specified user
 */
const sendProgressUpdate = (userId, data) => {
    if (!userId) return;
    const payload = JSON.stringify({ type: 'progress', data });
    clients.forEach(client => {
        if (parseInt(client.userId) === parseInt(userId)) {
            try {
                client.res.write(`data: ${payload}\n\n`);
            } catch (err) {
                console.error(`[Meta SSE Broadcast Error] client ${client.id}:`, err.message);
            }
        }
    });
};

module.exports = {
    addClient,
    sendProgressUpdate
};

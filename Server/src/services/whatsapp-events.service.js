let clients = [];

// Periodic ping to keep SSE connections alive
setInterval(() => {
    if (clients.length > 0) {
        broadcast('ping', { time: new Date().toISOString() });
    }
}, 30000);

/**
 * Register a new Server-Sent Events client
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
        res
    };

    clients.push(newClient);
    console.log(`[SSE] Client ${clientId} connected. Total clients: ${clients.length}`);

    // Send initial ping to establish connection
    res.write(`data: ${JSON.stringify({ type: 'ping', data: { status: 'connected' } })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`[SSE] Client ${clientId} disconnected. Total clients: ${clients.length}`);
    });
};

/**
 * Broadcast an event to all connected clients
 */
const broadcast = (type, data) => {
    const payload = JSON.stringify({ type, data });
    clients.forEach(client => {
        try {
            client.res.write(`data: ${payload}\n\n`);
        } catch (err) {
            console.error(`[SSE] Error broadcasting to client ${client.id}:`, err.message);
        }
    });
};

module.exports = {
    addClient,
    broadcast
};

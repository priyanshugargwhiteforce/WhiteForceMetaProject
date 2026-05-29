const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const accessLogStream = path.join(logDir, 'access.log');
const errorLogStream = path.join(logDir, 'error.log');

// Format date helper
const getTimestamp = () => new Date().toISOString();

// Middleware to log API calls with response time duration
const accessLogger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    
    // Wait for response to finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const userId = req.user ? req.user.id || req.user._id : 'Anonymous';
        const timestamp = getTimestamp();
        
        const logLine = `[${timestamp}] ${method} ${originalUrl} ${status} - ${duration}ms | IP: ${ip} | User: ${userId}\n`;
        
        // Append log line to access.log
        fs.appendFile(accessLogStream, logLine, (err) => {
            if (err) console.error('Error writing to access.log:', err);
        });
    });
    
    next();
};

// Helper function to log errors
const errorLogger = (err, req) => {
    const { method, originalUrl, ip } = req;
    const userId = req.user ? req.user.id || req.user._id : 'Anonymous';
    const timestamp = getTimestamp();
    
    const errorLine = `[${timestamp}] ERROR: ${err.message || err}\n` +
                      `Context: ${method} ${originalUrl} | IP: ${ip} | User: ${userId}\n` +
                      `Stack: ${err.stack || 'No stack trace available'}\n` +
                      `${'-'.repeat(80)}\n`;
                      
    fs.appendFile(errorLogStream, errorLine, (writeErr) => {
        if (writeErr) console.error('Error writing to error.log:', writeErr);
    });
};

module.exports = {
    accessLogger,
    errorLogger
};

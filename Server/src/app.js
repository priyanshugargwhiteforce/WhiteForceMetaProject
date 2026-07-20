const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { accessLogger, errorLogger } = require('./middlewares/logger.middleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(accessLogger);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Meta API Project Backend' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));

// Protected Routes
const { protect } = require('./middlewares/auth.middleware');
app.use('/api/users', protect, require('./routes/user.routes'));
app.use('/api/meta', protect, require('./routes/meta.routes'));
app.use('/api/meta/posting', require('./routes/meta-posting.routes'));
app.use('/api/ai', protect, require('./routes/ai.routes'));
app.use('/api/google', protect, require('./routes/google.routes'));
app.use('/api/reports', protect, require('./routes/reports.routes'));
app.use('/api/whatsapp', require('./routes/whatsapp/whatsapp.routes'));
app.use('/api/youtube-ads', protect, require('./routes/youtubeAd.routes'));
app.use('/api/linkedin', require('./routes/linkedin/linkedin.routes'));
app.use('/api/linkedin/ads', require('./routes/linkedin/ads.routes'));

app.use('/api/tasks', protect, require('./routes/task.routes'));;

// Phase 4 - Media Library, Assets, and Creatives Router Registry
app.use('/api/media', require('./routes/media.routes'));
app.use('/api/linkedin/assets', require('./routes/linkedin/assets.routes'));
app.use('/api/linkedin/creatives', require('./routes/linkedin/creatives.routes'));

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    errorLogger(err, req);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

module.exports = app;

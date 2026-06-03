const dotenv = require('dotenv');
const path = require('path');

// Load environment variables as early as possible
dotenv.config({ path: path.join(__dirname, '.env') });

const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    // Connect to Database
    await connectDB();

    // Initialize Queue Worker
    require('./src/services/whatsapp-queue.service');

    // Start listening
    app.listen(PORT, () => {
        console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
    });
};

startServer();

const Redis = require('ioredis');

let redisConnection;

if (process.env.REDIS_URL) {
  redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null // Required by BullMQ
  });
} else {
  const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null // Required by BullMQ
  };

  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }

  redisConnection = new Redis(redisConfig);
}

redisConnection.on('connect', () => {
  console.log('✓ Connected to Redis server successfully.');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

module.exports = redisConnection;

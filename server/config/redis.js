const redis = require('redis');

// Redis Configuration for High Availability
const redisConfig = {
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('❌ Redis: Max reconnection attempts reached');
                return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
        }
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: 0
};

// Create Redis client
const client = redis.createClient(redisConfig);

// Error handling
client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

client.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

client.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
});

client.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
});

// Connect to Redis
(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error('❌ Failed to connect to Redis:', err.message);
        console.log('⚠️  Running without Redis cache (reduced performance)');
    }
})();

// Cache helper functions
const cache = {
    // Get value from cache
    get: async (key) => {
        try {
            if (!client.isOpen) return null;
            const value = await client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            console.error('Cache get error:', err.message);
            return null;
        }
    },

    // Set value in cache with TTL (Time To Live)
    set: async (key, value, ttl = 3600) => {
        try {
            if (!client.isOpen) return false;
            await client.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('Cache set error:', err.message);
            return false;
        }
    },

    // Delete value from cache
    del: async (key) => {
        try {
            if (!client.isOpen) return false;
            await client.del(key);
            return true;
        } catch (err) {
            console.error('Cache del error:', err.message);
            return false;
        }
    },

    // Check if key exists
    exists: async (key) => {
        try {
            if (!client.isOpen) return false;
            return await client.exists(key);
        } catch (err) {
            console.error('Cache exists error:', err.message);
            return false;
        }
    },

    // Increment counter (for rate limiting)
    incr: async (key) => {
        try {
            if (!client.isOpen) return 0;
            return await client.incr(key);
        } catch (err) {
            console.error('Cache incr error:', err.message);
            return 0;
        }
    },

    // Set expiry on key
    expire: async (key, seconds) => {
        try {
            if (!client.isOpen) return false;
            await client.expire(key, seconds);
            return true;
        } catch (err) {
            console.error('Cache expire error:', err.message);
            return false;
        }
    },

    // Clear all cache
    flushAll: async () => {
        try {
            if (!client.isOpen) return false;
            await client.flushAll();
            return true;
        } catch (err) {
            console.error('Cache flush error:', err.message);
            return false;
        }
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Closing Redis connection...');
    await client.quit();
});

module.exports = { client, cache };

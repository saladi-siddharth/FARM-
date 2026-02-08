const { cache } = require('../config/redis');

/**
 * Caching middleware for API responses
 * Reduces database load by caching frequently accessed data
 */
const cacheMiddleware = (duration = 300) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate cache key from URL and query params
        const key = `cache:${req.originalUrl || req.url}`;

        try {
            // Try to get cached response
            const cachedResponse = await cache.get(key);

            if (cachedResponse) {
                console.log(`✅ Cache HIT: ${key}`);
                return res.json(cachedResponse);
            }

            console.log(`❌ Cache MISS: ${key}`);

            // Store original res.json function
            const originalJson = res.json.bind(res);

            // Override res.json to cache the response
            res.json = (body) => {
                // Cache the response
                cache.set(key, body, duration).catch(err => {
                    console.error('Failed to cache response:', err.message);
                });

                // Send the response
                return originalJson(body);
            };

            next();
        } catch (err) {
            console.error('Cache middleware error:', err.message);
            next();
        }
    };
};

/**
 * User data caching helper
 */
const userCache = {
    // Get user from cache
    getUser: async (userId) => {
        return await cache.get(`user:${userId}`);
    },

    // Set user in cache (5 minutes TTL)
    setUser: async (userId, userData) => {
        return await cache.set(`user:${userId}`, userData, 300);
    },

    // Invalidate user cache
    invalidateUser: async (userId) => {
        return await cache.del(`user:${userId}`);
    }
};

/**
 * Session caching helper
 */
const sessionCache = {
    // Get session
    getSession: async (sessionId) => {
        return await cache.get(`session:${sessionId}`);
    },

    // Set session (24 hours TTL)
    setSession: async (sessionId, sessionData) => {
        return await cache.set(`session:${sessionId}`, sessionData, 86400);
    },

    // Delete session
    deleteSession: async (sessionId) => {
        return await cache.del(`session:${sessionId}`);
    }
};

/**
 * Rate limiting with Redis
 */
const redisRateLimiter = async (identifier, maxRequests = 5, windowSeconds = 900) => {
    const key = `ratelimit:${identifier}`;

    try {
        const current = await cache.incr(key);

        if (current === 1) {
            await cache.expire(key, windowSeconds);
        }

        return {
            allowed: current <= maxRequests,
            remaining: Math.max(0, maxRequests - current),
            current
        };
    } catch (err) {
        console.error('Rate limiter error:', err.message);
        return { allowed: true, remaining: maxRequests, current: 0 };
    }
};

module.exports = {
    cacheMiddleware,
    userCache,
    sessionCache,
    redisRateLimiter
};

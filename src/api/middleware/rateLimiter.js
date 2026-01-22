/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter
 * 
 * @module api/middleware/rateLimiter
 */

'use strict';

const config = require('../../config');
const { RateLimitError } = require('../../utils/errors');

/**
 * Simple rate limiter store
 */
const requestStore = new Map();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestStore) {
        if (now - data.windowStart > config.security.rateLimit.windowMs) {
            requestStore.delete(key);
        }
    }
}, 60000);

/**
 * Create rate limiter middleware
 * @param {object} options - Rate limiter options
 * @returns {function} Express middleware
 */
function createRateLimiter(options = {}) {
    const windowMs = options.windowMs || config.security.rateLimit.windowMs;
    const max = options.max || config.security.rateLimit.maxRequests;
    const keyGenerator = options.keyGenerator || ((req) => req.ip || 'unknown');

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        let record = requestStore.get(key);

        if (!record || (now - record.windowStart > windowMs)) {
            record = { count: 0, windowStart: now };
        }

        record.count++;
        requestStore.set(key, record);

        const remaining = Math.max(0, max - record.count);
        const resetTime = new Date(record.windowStart + windowMs).toISOString();

        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetTime);

        if (record.count > max) {
            return next(new RateLimitError('Too many requests'));
        }

        next();
    };
}

/**
 * Default rate limiter
 */
const rateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 */
const strictRateLimiter = createRateLimiter({
    windowMs: 60000,
    max: 10
});

module.exports = {
    createRateLimiter,
    rateLimiter,
    strictRateLimiter
};

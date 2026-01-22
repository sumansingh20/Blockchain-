/**
 * API Middleware Exports
 * @module api/middleware
 */

'use strict';

const { validateBody, validateQuery, validateParams } = require('./validation');
const { createRateLimiter, rateLimiter, strictRateLimiter } = require('./rateLimiter');

module.exports = {
    validateBody,
    validateQuery,
    validateParams,
    createRateLimiter,
    rateLimiter,
    strictRateLimiter
};

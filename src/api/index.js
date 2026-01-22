/**
 * API Module Index
 * @module api
 */

'use strict';

const { registerRoutes } = require('./routes');
const middleware = require('./middleware');
const { successResponse, errorResponse, paginatedResponse } = require('./utils/response');

module.exports = {
    registerRoutes,
    middleware,
    successResponse,
    errorResponse,
    paginatedResponse
};

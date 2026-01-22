/**
 * API Response Utilities
 * Standardized API response formatting
 * 
 * @module api/utils/response
 */

'use strict';

/**
 * Success response formatter
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code
 */
function successResponse(res, data, statusCode = 200) {
    res.status(statusCode).json({
        success: true,
        timestamp: new Date().toISOString(),
        data
    });
}

/**
 * Error response formatter
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 */
function errorResponse(res, message, statusCode = 500, code = 'INTERNAL_ERROR') {
    res.status(statusCode).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: {
            code,
            message
        }
    });
}

/**
 * Paginated response formatter
 * @param {object} res - Express response object
 * @param {object[]} items - Array of items
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
function paginatedResponse(res, items, total, page = 1, limit = 10) {
    res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        data: items,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    });
}

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse
};

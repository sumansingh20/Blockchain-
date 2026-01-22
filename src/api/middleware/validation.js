/**
 * API Validation Middleware
 * Request validation utilities
 * 
 * @module api/middleware/validation
 */

'use strict';

const { ValidationError } = require('../../utils/errors');

/**
 * Validate request body against schema
 * @param {object} schema - Validation schema
 * @returns {function} Express middleware
 */
function validateBody(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value !== undefined && value !== null) {
                if (rules.type === 'number' && typeof value !== 'number') {
                    errors.push(`${field} must be a number`);
                }

                if (rules.type === 'string' && typeof value !== 'string') {
                    errors.push(`${field} must be a string`);
                }

                if (rules.min !== undefined && value < rules.min) {
                    errors.push(`${field} must be at least ${rules.min}`);
                }

                if (rules.max !== undefined && value > rules.max) {
                    errors.push(`${field} must be at most ${rules.max}`);
                }

                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
                }

                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${field} has invalid format`);
                }
            }
        }

        if (errors.length > 0) {
            return next(new ValidationError('Validation failed', errors));
        }

        next();
    };
}

/**
 * Validate query parameters
 * @param {object} schema - Validation schema
 * @returns {function} Express middleware
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [param, rules] of Object.entries(schema)) {
            let value = req.query[param];

            if (rules.required && (value === undefined || value === '')) {
                errors.push(`Query parameter ${param} is required`);
                continue;
            }

            if (value !== undefined && value !== '') {
                if (rules.type === 'number') {
                    value = parseFloat(value);
                    if (isNaN(value)) {
                        errors.push(`Query parameter ${param} must be a number`);
                    } else {
                        req.query[param] = value;
                    }
                }

                if (rules.type === 'integer') {
                    value = parseInt(value, 10);
                    if (isNaN(value)) {
                        errors.push(`Query parameter ${param} must be an integer`);
                    } else {
                        req.query[param] = value;
                    }
                }

                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`Query parameter ${param} must be one of: ${rules.enum.join(', ')}`);
                }
            }
        }

        if (errors.length > 0) {
            return next(new ValidationError('Query validation failed', errors));
        }

        next();
    };
}

/**
 * Validate route parameters
 * @param {object} schema - Validation schema
 * @returns {function} Express middleware
 */
function validateParams(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [param, rules] of Object.entries(schema)) {
            const value = req.params[param];

            if (rules.required && !value) {
                errors.push(`Route parameter ${param} is required`);
                continue;
            }

            if (value && rules.pattern && !rules.pattern.test(value)) {
                errors.push(`Route parameter ${param} has invalid format`);
            }
        }

        if (errors.length > 0) {
            return next(new ValidationError('Parameter validation failed', errors));
        }

        next();
    };
}

module.exports = {
    validateBody,
    validateQuery,
    validateParams
};

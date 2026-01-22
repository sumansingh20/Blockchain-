/**
 * Custom Error Classes
 * Standardized error handling across the application
 * 
 * @module utils/errors
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

/**
 * Base application error
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                code: this.code,
                message: this.message,
                timestamp: this.timestamp
            }
        };
    }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
    constructor(message, fields = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.fields = fields;
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                code: this.code,
                message: this.message,
                fields: this.fields,
                timestamp: this.timestamp
            }
        };
    }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.resource = resource;
    }
}

/**
 * Unauthorized error
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

/**
 * Forbidden error
 */
class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

/**
 * Blockchain error
 */
class BlockchainError extends AppError {
    constructor(message, txHash = null) {
        super(message, 500, 'BLOCKCHAIN_ERROR');
        this.txHash = txHash;
    }
}

/**
 * Settlement error
 */
class SettlementError extends AppError {
    constructor(message, settlementId = null) {
        super(message, 500, 'SETTLEMENT_ERROR');
        this.settlementId = settlementId;
    }
}

/**
 * Fraud detection error
 */
class FraudError extends AppError {
    constructor(message, fraudType, meterId = null) {
        super(message, 403, 'FRAUD_DETECTED');
        this.fraudType = fraudType;
        this.meterId = meterId;
    }
}

/**
 * Meter error
 */
class MeterError extends AppError {
    constructor(message, meterId = null) {
        super(message, 400, 'METER_ERROR');
        this.meterId = meterId;
    }
}

/**
 * Configuration error
 */
class ConfigError extends AppError {
    constructor(message) {
        super(message, 500, 'CONFIG_ERROR');
    }
}

/**
 * Rate limit error
 */
class RateLimitError extends AppError {
    constructor(retryAfter = 60) {
        super('Too many requests', 429, 'RATE_LIMIT');
        this.retryAfter = retryAfter;
    }
}

/**
 * Timeout error
 */
class TimeoutError extends AppError {
    constructor(operation = 'Operation') {
        super(`${operation} timed out`, 408, 'TIMEOUT');
    }
}

/**
 * Error handler middleware for Express
 */
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const response = err instanceof AppError ? err.toJSON() : {
        error: {
            name: 'InternalError',
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production' 
                ? 'An unexpected error occurred' 
                : err.message,
            timestamp: new Date().toISOString()
        }
    };

    res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch promise rejections
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    BlockchainError,
    SettlementError,
    FraudError,
    MeterError,
    ConfigError,
    RateLimitError,
    TimeoutError,
    errorHandler,
    asyncHandler
};

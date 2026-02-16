/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * Utility Classes and Helper Functions
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.colors = {
            reset: '\x1b[0m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            gray: '\x1b[90m'
        };
    }

    formatTime() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    log(level, color, message, ...args) {
        const time = this.colors.gray + this.formatTime() + this.colors.reset;
        const ctx = this.colors.cyan + `[${this.context}]` + this.colors.reset;
        const lvl = color + `[${level}]` + this.colors.reset;
        
        console.log(`${time} ${ctx} ${lvl}`, message, ...args);
    }

    info(message, ...args) {
        this.log('INFO', this.colors.blue, message, ...args);
    }

    success(message, ...args) {
        this.log('SUCCESS', this.colors.green, message, ...args);
    }

    warn(message, ...args) {
        this.log('WARN', this.colors.yellow, message, ...args);
    }

    error(message, ...args) {
        this.log('ERROR', this.colors.red, message, ...args);
    }

    debug(message, ...args) {
        if (process.env.DEBUG) {
            this.log('DEBUG', this.colors.magenta, message, ...args);
        }
    }

    http(message) {
        this.log('HTTP', this.colors.gray, message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class Validator {
    /**
     * Validate required fields
     */
    static required(obj, fields) {
        const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
        
        if (missing.length > 0) {
            const error = new Error(`Missing required fields: ${missing.join(', ')}`);
            error.status = 400;
            throw error;
        }
    }

    /**
     * Validate number in range
     */
    static number(value, name, min = -Infinity, max = Infinity) {
        const num = parseFloat(value);
        
        if (isNaN(num)) {
            const error = new Error(`${name} must be a valid number`);
            error.status = 400;
            throw error;
        }
        
        if (num < min || num > max) {
            const error = new Error(`${name} must be between ${min} and ${max}`);
            error.status = 400;
            throw error;
        }
        
        return num;
    }

    /**
     * Validate string
     */
    static string(value, name, minLength = 1, maxLength = 1000) {
        if (typeof value !== 'string') {
            const error = new Error(`${name} must be a string`);
            error.status = 400;
            throw error;
        }
        
        if (value.length < minLength || value.length > maxLength) {
            const error = new Error(`${name} must be between ${minLength} and ${maxLength} characters`);
            error.status = 400;
            throw error;
        }
        
        return value;
    }

    /**
     * Validate enum value
     */
    static enum(value, name, allowedValues) {
        if (!allowedValues.includes(value)) {
            const error = new Error(`${name} must be one of: ${allowedValues.join(', ')}`);
            error.status = 400;
            throw error;
        }
        
        return value;
    }

    /**
     * Validate timestamp
     */
    static timestamp(value, name) {
        const ts = parseInt(value);
        
        if (isNaN(ts) || ts < 0 || ts > Date.now() + 86400000) {
            const error = new Error(`${name} must be a valid timestamp`);
            error.status = 400;
            throw error;
        }
        
        return ts;
    }

    /**
     * Validate meter ID format
     */
    static meterId(value) {
        const pattern = /^NITJ-[A-Z]+-\d{3}$/;
        
        if (!pattern.test(value)) {
            const error = new Error('Invalid meter ID format. Expected: NITJ-XXX-000');
            error.status = 400;
            throw error;
        }
        
        return value;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ErrorHandler {
    static handle(error, req, res, next) {
        const logger = new Logger('Error');
        
        const status = error.status || error.statusCode || 500;
        const message = error.message || 'Internal server error';
        
        logger.error(`[${status}] ${message}`);
        
        if (process.env.NODE_ENV === 'development') {
            logger.error(error.stack);
        }
        
        res.status(status).json({
            success: false,
            error: message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }

    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    static notFound(req, res) {
        res.status(404).json({
            success: false,
            error: 'Resource not found',
            path: req.originalUrl
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format currency in INR
 */
function formatINR(amount) {
    return `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Format date in IST
 */
function formatDateIST(timestamp) {
    return new Date(timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata'
    });
}

/**
 * Generate unique ID
 */
function generateId(prefix = 'ID') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Retry async operation
 */
async function retry(operation, maxAttempts = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            if (attempt < maxAttempts) {
                await sleep(delay * attempt);
            }
        }
    }
    
    throw lastError;
}

/**
 * Deep clone object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculate percentage
 */
function percentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 10000) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    Logger,
    Validator,
    ErrorHandler,
    sleep,
    formatINR,
    formatDateIST,
    generateId,
    retry,
    deepClone,
    percentage
};

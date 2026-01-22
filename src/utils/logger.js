/**
 * Custom Logger Module
 * Professional logging with multiple transports and formatting
 * 
 * @module utils/logger
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const config = require('../config');

/**
 * Log levels with numeric priority
 */
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

const LEVEL_COLORS = {
    error: COLORS.red,
    warn: COLORS.yellow,
    info: COLORS.green,
    http: COLORS.magenta,
    debug: COLORS.cyan
};

/**
 * Logger class with configurable output
 */
class Logger {
    constructor(options = {}) {
        this.level = options.level || config.logging.level;
        this.prefix = options.prefix || '';
        this.colorize = options.colorize !== false && config.logging.colorize;
        this.timestamp = options.timestamp !== false;
    }

    /**
     * Check if level should be logged
     */
    shouldLog(level) {
        return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
    }

    /**
     * Format timestamp
     */
    getTimestamp() {
        if (!this.timestamp) return '';
        const now = new Date();
        return now.toISOString();
    }

    /**
     * Format log message
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = this.getTimestamp();
        const prefix = this.prefix ? `[${this.prefix}]` : '';
        
        if (config.logging.format === 'json') {
            return JSON.stringify({
                timestamp,
                level,
                prefix: this.prefix || undefined,
                message,
                ...meta
            });
        }

        const color = this.colorize ? LEVEL_COLORS[level] : '';
        const reset = this.colorize ? COLORS.reset : '';
        const gray = this.colorize ? COLORS.gray : '';
        const levelStr = level.toUpperCase().padEnd(5);
        
        let output = '';
        if (timestamp) output += `${gray}${timestamp}${reset} `;
        output += `${color}${levelStr}${reset} `;
        if (prefix) output += `${COLORS.cyan}${prefix}${reset} `;
        output += message;

        if (Object.keys(meta).length > 0) {
            output += ` ${gray}${JSON.stringify(meta)}${reset}`;
        }

        return output;
    }

    /**
     * Core log method
     */
    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const formatted = this.formatMessage(level, message, meta);
        const stream = level === 'error' ? process.stderr : process.stdout;
        stream.write(formatted + '\n');
    }

    /**
     * Log error message
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    /**
     * Log warning message
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    /**
     * Log info message
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    /**
     * Log HTTP request
     */
    http(message, meta = {}) {
        this.log('http', message, meta);
    }

    /**
     * Log debug message
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    /**
     * Create child logger with prefix
     */
    child(prefix) {
        return new Logger({
            level: this.level,
            prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
            colorize: this.colorize,
            timestamp: this.timestamp
        });
    }

    /**
     * Log a section header
     */
    section(title) {
        if (!this.shouldLog('info')) return;
        const line = '═'.repeat(60);
        console.log(`\n${COLORS.bright}${line}${COLORS.reset}`);
        console.log(`${COLORS.bright}  ${title}${COLORS.reset}`);
        console.log(`${COLORS.bright}${line}${COLORS.reset}`);
    }

    /**
     * Log a step in a process
     */
    step(number, description) {
        if (!this.shouldLog('info')) return;
        console.log(`\n${COLORS.cyan}[Step ${number}]${COLORS.reset} ${description}`);
        console.log(`${COLORS.gray}${'─'.repeat(50)}${COLORS.reset}`);
    }

    /**
     * Log success message
     */
    success(message) {
        console.log(`${COLORS.green}  ✓ ${message}${COLORS.reset}`);
    }

    /**
     * Log failure message
     */
    failure(message) {
        console.log(`${COLORS.red}  ✗ ${message}${COLORS.reset}`);
    }

    /**
     * Log a metric/value pair or object
     */
    metric(name, value, unit = '') {
        if (typeof value === 'object' && value !== null) {
            console.log(`${COLORS.cyan}     ${name}:${COLORS.reset}`);
            for (const [key, val] of Object.entries(value)) {
                console.log(`${COLORS.gray}       • ${key}:${COLORS.reset} ${val}`);
            }
        } else {
            const unitStr = unit ? ` ${unit}` : '';
            console.log(`${COLORS.gray}     ${name}:${COLORS.reset} ${value}${unitStr}`);
        }
    }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;
module.exports.createLogger = (prefix) => new Logger({ prefix });

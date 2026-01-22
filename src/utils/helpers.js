/**
 * Utility Functions Module
 * Common helper functions used across the application
 * 
 * @module utils/helpers
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const crypto = require('crypto');

/**
 * Generate a unique identifier
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique identifier
 */
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Generate a cryptographic hash
 * @param {string|object} data - Data to hash
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {string} Hex-encoded hash
 */
function hash(data, algorithm = 'sha256') {
    const input = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return crypto.createHash(algorithm).update(input).digest('hex');
}

/**
 * Format currency value
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: INR)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'INR') {
    const symbols = { INR: '₹', USD: '$', EUR: '€' };
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format energy value
 * @param {number} kwh - Energy in kWh
 * @returns {string} Formatted energy string
 */
function formatEnergy(kwh) {
    if (kwh >= 1000) {
        return `${(kwh / 1000).toFixed(2)} MWh`;
    }
    return `${kwh.toFixed(3)} kWh`;
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} whole - Whole value
 * @param {number} decimals - Decimal places
 * @returns {number} Percentage
 */
function percentage(part, whole, decimals = 2) {
    if (whole === 0) return 0;
    return parseFloat(((part / whole) * 100).toFixed(decimals));
}

/**
 * Calculate percentile from array
 * @param {number[]} arr - Array of numbers
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value
 */
function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {object} options - Retry options
 * @returns {Promise<any>} Function result
 */
async function retry(fn, options = {}) {
    const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = options;
    
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === maxAttempts) break;
            
            const delayMs = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
            await delay(delayMs);
        }
    }
    throw lastError;
}

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clone = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clone[key] = deepClone(obj[key]);
            }
        }
        return clone;
    }
    return obj;
}

/**
 * Validate required fields in an object
 * @param {object} obj - Object to validate
 * @param {string[]} required - Required field names
 * @throws {Error} If validation fails
 */
function validateRequired(obj, required) {
    const missing = required.filter(field => obj[field] === undefined || obj[field] === null);
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength = 50) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * Convert bytes to human readable format
 * @param {number} bytes - Bytes to convert
 * @returns {string} Human readable string
 */
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let value = bytes;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get current time of use period
 * @param {Date} date - Date to check (default: now)
 * @returns {string} Period name (PEAK, STANDARD, OFF_PEAK)
 */
function getTimeOfUsePeriod(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 18 && hour < 22) return 'PEAK';
    if (hour >= 0 && hour < 6) return 'OFF_PEAK';
    return 'STANDARD';
}

/**
 * Calculate time multiplier based on period
 * @param {string} period - Time period
 * @returns {number} Multiplier
 */
function getTimeMultiplier(period) {
    const multipliers = {
        PEAK: 1.20,
        STANDARD: 1.00,
        OFF_PEAK: 0.85
    };
    return multipliers[period] || 1.00;
}

module.exports = {
    generateId,
    hash,
    formatCurrency,
    formatEnergy,
    percentage,
    percentile,
    delay,
    retry,
    deepClone,
    validateRequired,
    truncate,
    formatBytes,
    getTimeOfUsePeriod,
    getTimeMultiplier
};

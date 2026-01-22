/**
 * Fraud Detection Engine
 * Multi-layer security validation for meter readings
 * 
 * @module core/security/FraudDetector
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const config = require('../../config');
const { generateId } = require('../../utils/helpers');
const logger = require('../../utils/logger').child('FraudDetector');

/**
 * Fraud types enumeration
 */
const FRAUD_TYPES = Object.freeze({
    REPLAY_ATTACK: 'REPLAY_ATTACK',
    CLOCK_SKEW: 'CLOCK_SKEW',
    SEQUENCE_ANOMALY: 'SEQUENCE_ANOMALY',
    VALUE_ANOMALY: 'VALUE_ANOMALY',
    SIGNATURE_INVALID: 'SIGNATURE_INVALID',
    RATE_LIMIT: 'RATE_LIMIT'
});

/**
 * Severity levels
 */
const SEVERITY = Object.freeze({
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
});

/**
 * Fraud Detection Engine
 * Implements multiple detection algorithms for meter data validation
 */
class FraudDetector {
    constructor(options = {}) {
        this.config = {
            replayWindowMs: options.replayWindowMs || config.security.fraud.replayWindowMs,
            clockSkewToleranceMs: options.clockSkewToleranceMs || config.security.fraud.clockSkewToleranceMs,
            maxValueKwh: options.maxValueKwh || config.security.fraud.maxValueKwh,
            minValueKwh: options.minValueKwh || config.security.fraud.minValueKwh
        };

        this.signatureCache = new Map();
        this.sequenceTracker = new Map();
        this.rateTracker = new Map();
        this.alerts = [];
        this.stats = {
            totalChecks: 0,
            fraudsDetected: 0,
            byType: Object.fromEntries(Object.keys(FRAUD_TYPES).map(k => [k, 0]))
        };
    }

    /**
     * Run comprehensive fraud detection
     * @param {object} signedPayload - Signed meter reading
     * @param {string} meterId - Meter identifier
     * @returns {object} Detection results
     */
    detect(signedPayload, meterId) {
        const startTime = Date.now();
        this.stats.totalChecks++;

        const results = {
            detectionId: generateId('FRD'),
            meterId,
            timestamp: new Date().toISOString(),
            isClean: true,
            checks: [],
            alerts: []
        };

        const checks = [
            () => this._checkReplay(signedPayload, meterId),
            () => this._checkClockSkew(signedPayload),
            () => this._checkSequence(signedPayload, meterId),
            () => this._checkValueRange(signedPayload),
            () => this._checkRateLimit(meterId)
        ];

        for (const check of checks) {
            const result = check();
            results.checks.push(result);

            if (!result.passed) {
                results.isClean = false;
                const alert = this._createAlert(result, meterId);
                results.alerts.push(alert);
                this.alerts.push(alert);
                this.stats.fraudsDetected++;
                this.stats.byType[result.type]++;
            }
        }

        results.latencyMs = Date.now() - startTime;
        return results;
    }

    /**
     * Check for replay attacks
     * @private
     */
    _checkReplay(signedPayload, meterId) {
        const signature = signedPayload.signature;
        const now = Date.now();

        if (!this.signatureCache.has(meterId)) {
            this.signatureCache.set(meterId, []);
        }

        const cache = this.signatureCache.get(meterId);
        const cutoff = now - this.config.replayWindowMs;
        
        const validEntries = cache.filter(entry => entry.timestamp > cutoff);
        this.signatureCache.set(meterId, validEntries);

        const isDuplicate = validEntries.some(entry => entry.signature === signature);

        if (isDuplicate) {
            return {
                check: 'REPLAY_DETECTION',
                type: FRAUD_TYPES.REPLAY_ATTACK,
                passed: false,
                severity: SEVERITY.CRITICAL,
                message: `Duplicate signature detected within ${this.config.replayWindowMs}ms window`
            };
        }

        validEntries.push({ signature, timestamp: now });
        
        return {
            check: 'REPLAY_DETECTION',
            type: FRAUD_TYPES.REPLAY_ATTACK,
            passed: true,
            message: 'No replay detected'
        };
    }

    /**
     * Check for clock skew
     * @private
     */
    _checkClockSkew(signedPayload) {
        const signedAt = signedPayload.signedAt;
        if (!signedAt) {
            return {
                check: 'CLOCK_SKEW',
                type: FRAUD_TYPES.CLOCK_SKEW,
                passed: true,
                message: 'No timestamp to verify'
            };
        }

        const payloadTime = new Date(signedAt).getTime();
        const serverTime = Date.now();
        const skew = Math.abs(serverTime - payloadTime);

        if (skew > this.config.clockSkewToleranceMs) {
            return {
                check: 'CLOCK_SKEW',
                type: FRAUD_TYPES.CLOCK_SKEW,
                passed: false,
                severity: SEVERITY.MEDIUM,
                message: `Clock skew ${skew}ms exceeds tolerance ${this.config.clockSkewToleranceMs}ms`,
                skewMs: skew
            };
        }

        return {
            check: 'CLOCK_SKEW',
            type: FRAUD_TYPES.CLOCK_SKEW,
            passed: true,
            message: `Clock skew ${skew}ms within tolerance`,
            skewMs: skew
        };
    }

    /**
     * Check sequence numbers
     * @private
     */
    _checkSequence(signedPayload, meterId) {
        const sequence = signedPayload.payload?.sequenceNumber;
        
        if (sequence === undefined || sequence === null) {
            return {
                check: 'SEQUENCE_VALIDATION',
                type: FRAUD_TYPES.SEQUENCE_ANOMALY,
                passed: true,
                message: 'No sequence number to verify'
            };
        }

        const lastSequence = this.sequenceTracker.get(meterId);
        this.sequenceTracker.set(meterId, sequence);

        if (lastSequence !== undefined && sequence <= lastSequence) {
            return {
                check: 'SEQUENCE_VALIDATION',
                type: FRAUD_TYPES.SEQUENCE_ANOMALY,
                passed: false,
                severity: SEVERITY.HIGH,
                message: `Sequence ${sequence} not greater than last ${lastSequence}`,
                expected: lastSequence + 1,
                received: sequence
            };
        }

        return {
            check: 'SEQUENCE_VALIDATION',
            type: FRAUD_TYPES.SEQUENCE_ANOMALY,
            passed: true,
            message: 'Sequence valid',
            sequence
        };
    }

    /**
     * Check value ranges
     * @private
     */
    _checkValueRange(signedPayload) {
        const meterData = signedPayload.payload?.meterData || signedPayload.payload;
        const kWh = meterData?.kWh;

        if (kWh === undefined || kWh === null) {
            return {
                check: 'VALUE_RANGE',
                type: FRAUD_TYPES.VALUE_ANOMALY,
                passed: true,
                message: 'No kWh value to verify'
            };
        }

        if (kWh < this.config.minValueKwh) {
            return {
                check: 'VALUE_RANGE',
                type: FRAUD_TYPES.VALUE_ANOMALY,
                passed: false,
                severity: SEVERITY.LOW,
                message: `Value ${kWh} kWh below minimum ${this.config.minValueKwh} kWh`,
                value: kWh,
                min: this.config.minValueKwh
            };
        }

        if (kWh > this.config.maxValueKwh) {
            return {
                check: 'VALUE_RANGE',
                type: FRAUD_TYPES.VALUE_ANOMALY,
                passed: false,
                severity: SEVERITY.MEDIUM,
                message: `Value ${kWh} kWh exceeds maximum ${this.config.maxValueKwh} kWh`,
                value: kWh,
                max: this.config.maxValueKwh
            };
        }

        return {
            check: 'VALUE_RANGE',
            type: FRAUD_TYPES.VALUE_ANOMALY,
            passed: true,
            message: 'Value within acceptable range',
            value: kWh
        };
    }

    /**
     * Check rate limiting
     * @private
     */
    _checkRateLimit(meterId) {
        const now = Date.now();
        const windowMs = 60000;
        const maxRequests = 100;

        if (!this.rateTracker.has(meterId)) {
            this.rateTracker.set(meterId, []);
        }

        const requests = this.rateTracker.get(meterId);
        const cutoff = now - windowMs;
        const recentRequests = requests.filter(t => t > cutoff);
        recentRequests.push(now);
        this.rateTracker.set(meterId, recentRequests);

        if (recentRequests.length > maxRequests) {
            return {
                check: 'RATE_LIMIT',
                type: FRAUD_TYPES.RATE_LIMIT,
                passed: false,
                severity: SEVERITY.MEDIUM,
                message: `Rate limit exceeded: ${recentRequests.length} requests in ${windowMs}ms`,
                count: recentRequests.length,
                limit: maxRequests
            };
        }

        return {
            check: 'RATE_LIMIT',
            type: FRAUD_TYPES.RATE_LIMIT,
            passed: true,
            message: 'Within rate limit',
            count: recentRequests.length,
            limit: maxRequests
        };
    }

    /**
     * Create alert object
     * @private
     */
    _createAlert(checkResult, meterId) {
        return {
            alertId: generateId('ALT'),
            type: checkResult.type,
            severity: checkResult.severity,
            meterId,
            message: checkResult.message,
            details: { ...checkResult },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get recent alerts
     * @param {object} filter - Filter options
     * @returns {object[]} Filtered alerts
     */
    getAlerts(filter = {}) {
        let alerts = [...this.alerts];

        if (filter.type) {
            alerts = alerts.filter(a => a.type === filter.type);
        }
        if (filter.meterId) {
            alerts = alerts.filter(a => a.meterId === filter.meterId);
        }
        if (filter.severity) {
            alerts = alerts.filter(a => a.severity === filter.severity);
        }
        if (filter.limit) {
            alerts = alerts.slice(-filter.limit);
        }

        return alerts;
    }

    /**
     * Clear alerts
     */
    clearAlerts() {
        this.alerts = [];
    }

    /**
     * Get statistics
     * @returns {object} Detection statistics
     */
    getStats() {
        return {
            ...this.stats,
            fraudRate: this.stats.totalChecks > 0 
                ? ((this.stats.fraudsDetected / this.stats.totalChecks) * 100).toFixed(2) + '%'
                : '0%',
            activeMeters: this.sequenceTracker.size,
            cachedSignatures: Array.from(this.signatureCache.values())
                .reduce((sum, arr) => sum + arr.length, 0)
        };
    }

    /**
     * Reset all state
     */
    reset() {
        this.signatureCache.clear();
        this.sequenceTracker.clear();
        this.rateTracker.clear();
        this.alerts = [];
        this.stats = {
            totalChecks: 0,
            fraudsDetected: 0,
            byType: Object.fromEntries(Object.keys(FRAUD_TYPES).map(k => [k, 0]))
        };
    }
}

module.exports = FraudDetector;
module.exports.FRAUD_TYPES = FRAUD_TYPES;
module.exports.SEVERITY = SEVERITY;

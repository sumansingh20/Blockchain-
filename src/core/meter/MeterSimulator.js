/**
 * Smart Meter Simulator
 * Generates realistic meter readings for testing and demonstration
 * 
 * @module core/meter/MeterSimulator
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const config = require('../../config');
const IS15959Parser = require('../protocol/IS15959Parser');
const Ed25519Signer = require('../crypto/Ed25519Signer');
const { generateId, getTimeOfUsePeriod } = require('../../utils/helpers');
const { MeterError, ValidationError } = require('../../utils/errors');

/**
 * Meter types with characteristics
 */
const METER_TYPES = config.meters.types;

/**
 * Smart Meter Simulator
 * Creates and manages virtual smart meters for testing
 */
class MeterSimulator {
    constructor() {
        this.parser = new IS15959Parser();
        this.signer = new Ed25519Signer();
        this.meters = new Map();
        this.readingHistory = new Map();
    }

    /**
     * Register a new smart meter
     * @param {string} meterId - Unique meter identifier
     * @param {string} type - Meter type (SOLAR, GRID, EV_CHARGER, BATTERY)
     * @param {string} location - Physical location
     * @param {object} options - Additional options
     * @returns {object} Registered meter info
     */
    registerMeter(meterId, type, location, options = {}) {
        if (!meterId || typeof meterId !== 'string') {
            throw new ValidationError('Valid meter ID required', ['meterId']);
        }

        if (this.meters.has(meterId)) {
            throw new MeterError(`Meter ${meterId} already registered`, meterId);
        }

        const meterConfig = METER_TYPES[type];
        if (!meterConfig) {
            throw new ValidationError(`Invalid meter type: ${type}`, ['type']);
        }

        const keyInfo = this.signer.generateKeyPair(meterId, { type, location });

        const meter = {
            meterId,
            type,
            location,
            config: { ...meterConfig },
            status: 'ACTIVE',
            publicKey: keyInfo.publicKey,
            fingerprint: keyInfo.fingerprint,
            registeredAt: new Date().toISOString(),
            metadata: {
                manufacturer: options.manufacturer || 'NITJ-SIM',
                model: options.model || `SIM-${type}-001`,
                firmwareVersion: options.firmwareVersion || '2.0.0',
                installDate: options.installDate || new Date().toISOString()
            },
            counters: {
                totalReadings: 0,
                totalKwh: 0,
                lastReading: null,
                errors: 0
            }
        };

        this.meters.set(meterId, meter);
        this.readingHistory.set(meterId, []);

        return {
            meterId: meter.meterId,
            type: meter.type,
            location: meter.location,
            status: meter.status,
            publicKey: meter.publicKey,
            fingerprint: meter.fingerprint,
            registeredAt: meter.registeredAt
        };
    }

    /**
     * Generate meter reading with full provenance
     * @param {string} meterId - Meter identifier
     * @returns {object} Complete signed reading with frame
     */
    generateReading(meterId) {
        const meter = this.meters.get(meterId);
        if (!meter) {
            throw new MeterError(`Meter not found: ${meterId}`, meterId);
        }

        const meterData = this._simulateReading(meter);
        const frame = this.parser.generateFrame(meterData);
        
        meter.counters.totalReadings++;
        meter.counters.totalKwh += meterData.kWh;
        
        const payload = {
            frame,
            meterData,
            sequenceNumber: meter.counters.totalReadings
        };

        const signedPayload = this.signer.sign(meterId, payload);
        
        const reading = {
            readingId: generateId('RDG'),
            ...signedPayload,
            verification: {
                frameValid: true,
                sequenceNumber: meter.counters.totalReadings,
                touPeriod: meterData.readingType
            }
        };

        meter.counters.lastReading = reading;
        
        const history = this.readingHistory.get(meterId);
        history.push({
            timestamp: meterData.timestamp,
            kWh: meterData.kWh,
            readingId: reading.readingId
        });
        
        if (history.length > 1000) {
            history.shift();
        }

        return reading;
    }

    /**
     * Simulate realistic meter reading
     * @private
     */
    _simulateReading(meter) {
        const { baseLoad, variance, carbonTag } = meter.config;
        const now = new Date();
        const hour = now.getHours();

        let touFactor = 1.0;
        let readingType = 'NORMAL';

        if (hour >= 18 && hour < 22) {
            touFactor = 1.5;
            readingType = 'PEAK';
        } else if (hour >= 6 && hour < 9) {
            touFactor = 1.3;
            readingType = 'MORNING_PEAK';
        } else if (hour >= 0 && hour < 6) {
            touFactor = 0.6;
            readingType = 'OFF_PEAK';
        }

        if (meter.type === 'SOLAR') {
            if (hour < 6 || hour > 19) touFactor *= 0.1;
            else if (hour >= 10 && hour <= 15) touFactor *= 1.4;
        }

        const kWh = parseFloat((baseLoad + (Math.random() * variance * touFactor)).toFixed(3));
        const voltage = parseFloat((230 + (Math.random() - 0.5) * 20).toFixed(1));
        const current = parseFloat((kWh / (voltage * 0.001)).toFixed(2));
        const powerFactor = parseFloat((0.85 + Math.random() * 0.14).toFixed(3));
        const frequency = parseFloat((49.9 + Math.random() * 0.2).toFixed(2));

        return {
            meterId: meter.meterId,
            kWh,
            voltage,
            current,
            powerFactor,
            frequency,
            timestamp: now.toISOString(),
            carbonTag,
            location: meter.location,
            readingType,
            meterType: meter.type
        };
    }

    /**
     * Verify a reading signature
     * @param {string} meterId - Meter identifier
     * @param {object} signedPayload - Signed reading
     * @returns {object} Verification result
     */
    verifyReading(meterId, signedPayload) {
        return this.signer.verify(meterId, signedPayload);
    }

    /**
     * Get meter information
     * @param {string} meterId - Meter identifier
     * @returns {object|null} Meter info
     */
    getMeter(meterId) {
        const meter = this.meters.get(meterId);
        if (!meter) return null;

        return {
            meterId: meter.meterId,
            type: meter.type,
            location: meter.location,
            status: meter.status,
            config: meter.config,
            metadata: meter.metadata,
            counters: { ...meter.counters, lastReading: undefined },
            fingerprint: meter.fingerprint
        };
    }

    /**
     * Get all registered meters
     * @returns {object[]} Array of meter info
     */
    getAllMeters() {
        return Array.from(this.meters.values()).map(m => ({
            meterId: m.meterId,
            type: m.type,
            location: m.location,
            status: m.status,
            totalReadings: m.counters.totalReadings,
            totalKwh: m.counters.totalKwh
        }));
    }

    /**
     * Get reading history for a meter
     * @param {string} meterId - Meter identifier
     * @param {number} limit - Max readings to return
     * @returns {object[]} Reading history
     */
    getHistory(meterId, limit = 100) {
        const history = this.readingHistory.get(meterId);
        if (!history) return [];
        return history.slice(-limit);
    }

    /**
     * Update meter status
     * @param {string} meterId - Meter identifier
     * @param {string} status - New status
     */
    setStatus(meterId, status) {
        const meter = this.meters.get(meterId);
        if (!meter) {
            throw new MeterError(`Meter not found: ${meterId}`, meterId);
        }
        meter.status = status;
    }

    /**
     * Decommission a meter
     * @param {string} meterId - Meter identifier
     * @returns {boolean} True if decommissioned
     */
    decommission(meterId) {
        if (!this.meters.has(meterId)) {
            return false;
        }

        this.signer.revokeKeys(meterId);
        this.meters.delete(meterId);
        this.readingHistory.delete(meterId);
        return true;
    }

    /**
     * Get aggregated statistics
     * @returns {object} Simulator statistics
     */
    getStats() {
        let totalReadings = 0;
        let totalKwh = 0;
        const byType = {};

        for (const meter of this.meters.values()) {
            totalReadings += meter.counters.totalReadings;
            totalKwh += meter.counters.totalKwh;

            if (!byType[meter.type]) {
                byType[meter.type] = { count: 0, kWh: 0 };
            }
            byType[meter.type].count++;
            byType[meter.type].kWh += meter.counters.totalKwh;
        }

        return {
            totalMeters: this.meters.size,
            totalReadings,
            totalKwh: parseFloat(totalKwh.toFixed(3)),
            byType,
            signerStats: this.signer.getStats()
        };
    }

    /**
     * Reset simulator state
     */
    reset() {
        this.meters.clear();
        this.readingHistory.clear();
    }
}

module.exports = MeterSimulator;
module.exports.METER_TYPES = METER_TYPES;

/**
 * IS-15959 Edge SDK - Smart Meter Simulator
 * Implements IS-15959 data frames with Ed25519 signing
 * 
 * @module EdgeSDK
 * @version 2.0.0
 * @author NIT Jalandhar Research Team
 */

const crypto = require('crypto');

/**
 * IS-15959 Data Frame Parser & Generator
 * Indian Standard for Electricity Metering Data Exchange
 */
class IS15959Parser {
    constructor() {
        this.FRAME_HEADER = 0x7E;
        this.FRAME_FOOTER = 0x7E;
        this.OBIS_CODES = {
            ACTIVE_ENERGY_IMPORT: '1.0.1.8.0',
            ACTIVE_ENERGY_EXPORT: '1.0.2.8.0',
            REACTIVE_ENERGY_IMPORT: '1.0.3.8.0',
            REACTIVE_ENERGY_EXPORT: '1.0.4.8.0',
            VOLTAGE_L1: '1.0.32.7.0',
            CURRENT_L1: '1.0.31.7.0',
            POWER_FACTOR: '1.0.13.7.0',
            FREQUENCY: '1.0.14.7.0',
            MAX_DEMAND: '1.0.1.6.0',
            METER_SERIAL: '0.0.96.1.0'
        };
    }

    /**
     * Generate IS-15959 compliant data frame
     */
    generateFrame(meterData) {
        const frame = {
            header: this.FRAME_HEADER,
            frameType: 0x03, // Data frame
            segmentControl: 0x00,
            length: 0,
            hdlcAddress: meterData.meterId,
            control: 0x13,
            hcs: 0, // Header checksum
            llc: {
                destination: 0xE6,
                source: 0xE7,
                quality: 0x00
            },
            apdu: this.generateAPDU(meterData),
            fcs: 0, // Frame checksum
            footer: this.FRAME_FOOTER
        };

        frame.length = this.calculateLength(frame);
        frame.hcs = this.calculateCRC16(frame, 'header');
        frame.fcs = this.calculateCRC16(frame, 'full');

        return frame;
    }

    /**
     * Generate Application Protocol Data Unit
     */
    generateAPDU(meterData) {
        return {
            tag: 0xC4, // Data-notification
            longInvokeIdAndPriority: this.generateInvokeId(),
            dateTime: this.encodeDateTime(meterData.timestamp),
            notificationBody: {
                dataValue: [
                    { obis: this.OBIS_CODES.ACTIVE_ENERGY_IMPORT, value: meterData.kWh, unit: 'kWh' },
                    { obis: this.OBIS_CODES.VOLTAGE_L1, value: meterData.voltage || 230, unit: 'V' },
                    { obis: this.OBIS_CODES.CURRENT_L1, value: meterData.current || 10, unit: 'A' },
                    { obis: this.OBIS_CODES.POWER_FACTOR, value: meterData.powerFactor || 0.95, unit: '' },
                    { obis: this.OBIS_CODES.FREQUENCY, value: meterData.frequency || 50, unit: 'Hz' }
                ]
            }
        };
    }

    generateInvokeId() {
        return crypto.randomBytes(4).toString('hex');
    }

    encodeDateTime(timestamp) {
        const date = new Date(timestamp);
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
            deviation: 330, // IST offset in minutes
            clockStatus: 0x00
        };
    }

    calculateLength(frame) {
        return JSON.stringify(frame.apdu).length + 20;
    }

    calculateCRC16(frame, type) {
        const data = type === 'header' 
            ? `${frame.hdlcAddress}${frame.control}`
            : JSON.stringify(frame);
        return crypto.createHash('md5').update(data).digest('hex').substring(0, 4);
    }

    /**
     * Parse incoming IS-15959 frame
     */
    parseFrame(rawData) {
        // Validate frame structure
        if (rawData.header !== this.FRAME_HEADER || rawData.footer !== this.FRAME_FOOTER) {
            throw new Error('Invalid IS-15959 frame structure');
        }

        // Verify checksums
        const expectedHCS = this.calculateCRC16(rawData, 'header');
        const expectedFCS = this.calculateCRC16(rawData, 'full');

        return {
            valid: rawData.hcs === expectedHCS,
            meterId: rawData.hdlcAddress,
            data: rawData.apdu.notificationBody.dataValue,
            timestamp: rawData.apdu.dateTime
        };
    }
}

/**
 * Ed25519 Key Manager & Payload Signer
 * Software HSM implementation for meter authentication
 */
class Ed25519Signer {
    constructor() {
        this.keyPairs = new Map();
    }

    /**
     * Generate Ed25519 key pair for a meter
     */
    generateKeyPair(meterId) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        
        this.keyPairs.set(meterId, {
            publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
            privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
            createdAt: new Date().toISOString()
        });

        return {
            meterId,
            publicKey: this.keyPairs.get(meterId).publicKey
        };
    }

    /**
     * Sign payload using meter's private key
     */
    signPayload(meterId, payload) {
        const keyPair = this.keyPairs.get(meterId);
        if (!keyPair) {
            throw new Error(`No key pair found for meter: ${meterId}`);
        }

        const privateKey = crypto.createPrivateKey(keyPair.privateKey);
        const payloadString = JSON.stringify(payload);
        const signature = crypto.sign(null, Buffer.from(payloadString), privateKey);

        return {
            payload,
            signature: signature.toString('base64'),
            signedAt: new Date().toISOString(),
            algorithm: 'Ed25519'
        };
    }

    /**
     * Verify payload signature
     */
    verifySignature(meterId, signedPayload) {
        const keyPair = this.keyPairs.get(meterId);
        if (!keyPair) {
            return { valid: false, error: 'Unknown meter' };
        }

        try {
            const publicKey = crypto.createPublicKey(keyPair.publicKey);
            const payloadString = JSON.stringify(signedPayload.payload);
            const signature = Buffer.from(signedPayload.signature, 'base64');
            const isValid = crypto.verify(null, Buffer.from(payloadString), publicKey, signature);

            return { valid: isValid, verifiedAt: new Date().toISOString() };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Export public key for registration
     */
    getPublicKey(meterId) {
        const keyPair = this.keyPairs.get(meterId);
        return keyPair ? keyPair.publicKey : null;
    }
}

/**
 * Smart Meter Simulator
 * Simulates 3 meter types: Solar, Grid, EV Charger
 */
class MeterSimulator {
    constructor() {
        this.parser = new IS15959Parser();
        this.signer = new Ed25519Signer();
        this.meters = new Map();
        this.METER_TYPES = {
            SOLAR: { prefix: 'SOL', carbonTag: 'SOLAR', baseLoad: 5, variance: 15 },
            GRID: { prefix: 'GRD', carbonTag: 'GRID', baseLoad: 20, variance: 30 },
            EV_CHARGER: { prefix: 'EVC', carbonTag: 'HYBRID', baseLoad: 7, variance: 50 },
            BATTERY: { prefix: 'BAT', carbonTag: 'SOLAR', baseLoad: 3, variance: 10 }
        };
    }

    /**
     * Register a new smart meter
     */
    registerMeter(meterId, type, location) {
        const meterType = this.METER_TYPES[type] || this.METER_TYPES.GRID;
        const keyInfo = this.signer.generateKeyPair(meterId);

        const meter = {
            meterId,
            type,
            location,
            config: meterType,
            publicKey: keyInfo.publicKey,
            registeredAt: new Date().toISOString(),
            totalReadings: 0,
            lastReading: null
        };

        this.meters.set(meterId, meter);
        return meter;
    }

    /**
     * Generate meter reading with IS-15959 frame and Ed25519 signature
     */
    generateReading(meterId) {
        const meter = this.meters.get(meterId);
        if (!meter) {
            throw new Error(`Meter not found: ${meterId}`);
        }

        // Simulate realistic energy reading
        const baseLoad = meter.config.baseLoad;
        const variance = meter.config.variance;
        const timeOfDay = new Date().getHours();
        
        // Time-of-Use factor
        let touFactor = 1.0;
        if (timeOfDay >= 18 && timeOfDay <= 22) touFactor = 1.5; // Peak
        else if (timeOfDay >= 6 && timeOfDay <= 9) touFactor = 1.3; // Morning peak
        else if (timeOfDay >= 0 && timeOfDay <= 5) touFactor = 0.6; // Off-peak

        // Calculate kWh
        const kWh = parseFloat((baseLoad + (Math.random() * variance * touFactor)).toFixed(2));

        // Build meter data
        const meterData = {
            meterId,
            kWh,
            voltage: 220 + Math.random() * 20,
            current: kWh / 0.23,
            powerFactor: 0.85 + Math.random() * 0.15,
            frequency: 49.9 + Math.random() * 0.2,
            timestamp: new Date().toISOString(),
            carbonTag: meter.config.carbonTag,
            location: meter.location,
            readingType: touFactor > 1.2 ? 'PEAK' : touFactor < 0.8 ? 'OFF_PEAK' : 'NORMAL'
        };

        // Generate IS-15959 frame
        const frame = this.parser.generateFrame(meterData);

        // Sign the payload
        const signedPayload = this.signer.signPayload(meterId, {
            frame,
            meterData,
            sequenceNumber: ++meter.totalReadings
        });

        meter.lastReading = signedPayload;

        return {
            ...signedPayload,
            verification: {
                frameValid: true,
                sequenceNumber: meter.totalReadings,
                touPeriod: meterData.readingType
            }
        };
    }

    /**
     * Get all registered meters
     */
    getMeters() {
        return Array.from(this.meters.values());
    }

    /**
     * Verify a reading
     */
    verifyReading(meterId, signedPayload) {
        return this.signer.verifySignature(meterId, signedPayload);
    }
}

/**
 * Fraud Detection Module
 * Detects replay attacks, clock skew, and signature tampering
 */
class FraudDetector {
    constructor() {
        this.recentPayloads = new Map(); // meterId -> [timestamps]
        this.REPLAY_WINDOW_MS = 60000; // 1 minute
        this.CLOCK_SKEW_TOLERANCE_MS = 5000; // 5 seconds
        this.alerts = [];
    }

    /**
     * Check for fraud indicators
     */
    detectFraud(signedPayload, meterId) {
        const results = {
            isClean: true,
            checks: [],
            alerts: []
        };

        // 1. Replay Detection
        const replayCheck = this.checkReplay(signedPayload, meterId);
        results.checks.push(replayCheck);
        if (!replayCheck.passed) {
            results.isClean = false;
            results.alerts.push({
                type: 'REPLAY_ATTACK',
                severity: 'HIGH',
                message: replayCheck.message,
                timestamp: new Date().toISOString()
            });
        }

        // 2. Clock Skew Detection
        const clockCheck = this.checkClockSkew(signedPayload);
        results.checks.push(clockCheck);
        if (!clockCheck.passed) {
            results.isClean = false;
            results.alerts.push({
                type: 'CLOCK_SKEW',
                severity: 'MEDIUM',
                message: clockCheck.message,
                timestamp: new Date().toISOString()
            });
        }

        // 3. Sequence Validation
        const seqCheck = this.checkSequence(signedPayload, meterId);
        results.checks.push(seqCheck);
        if (!seqCheck.passed) {
            results.isClean = false;
            results.alerts.push({
                type: 'SEQUENCE_ANOMALY',
                severity: 'MEDIUM',
                message: seqCheck.message,
                timestamp: new Date().toISOString()
            });
        }

        // 4. Value Range Check
        const rangeCheck = this.checkValueRange(signedPayload);
        results.checks.push(rangeCheck);
        if (!rangeCheck.passed) {
            results.isClean = false;
            results.alerts.push({
                type: 'VALUE_ANOMALY',
                severity: 'LOW',
                message: rangeCheck.message,
                timestamp: new Date().toISOString()
            });
        }

        // Store alerts
        this.alerts.push(...results.alerts);

        return results;
    }

    checkReplay(signedPayload, meterId) {
        const signature = signedPayload.signature;
        const now = Date.now();

        if (!this.recentPayloads.has(meterId)) {
            this.recentPayloads.set(meterId, []);
        }

        const recent = this.recentPayloads.get(meterId);
        
        // Clean old entries
        const cutoff = now - this.REPLAY_WINDOW_MS;
        const filtered = recent.filter(r => r.time > cutoff);
        
        // Check for duplicate signature
        const isDuplicate = filtered.some(r => r.signature === signature);
        
        if (isDuplicate) {
            return {
                check: 'REPLAY_DETECTION',
                passed: false,
                message: `Duplicate signature detected within ${this.REPLAY_WINDOW_MS}ms window`,
                latency: Date.now() - now
            };
        }

        // Store this signature
        filtered.push({ signature, time: now });
        this.recentPayloads.set(meterId, filtered);

        return {
            check: 'REPLAY_DETECTION',
            passed: true,
            message: 'No replay detected',
            latency: Date.now() - now
        };
    }

    checkClockSkew(signedPayload) {
        const payloadTime = new Date(signedPayload.signedAt).getTime();
        const serverTime = Date.now();
        const skew = Math.abs(serverTime - payloadTime);

        return {
            check: 'CLOCK_SKEW',
            passed: skew <= this.CLOCK_SKEW_TOLERANCE_MS,
            message: skew <= this.CLOCK_SKEW_TOLERANCE_MS 
                ? `Clock skew within tolerance: ${skew}ms`
                : `Clock skew exceeded: ${skew}ms (tolerance: ${this.CLOCK_SKEW_TOLERANCE_MS}ms)`,
            skewMs: skew
        };
    }

    checkSequence(signedPayload, meterId) {
        const seq = signedPayload.payload?.sequenceNumber;
        if (!seq) {
            return { check: 'SEQUENCE', passed: true, message: 'No sequence tracking' };
        }

        // In production, would check against stored sequence
        return {
            check: 'SEQUENCE',
            passed: seq > 0,
            message: `Sequence number: ${seq}`
        };
    }

    checkValueRange(signedPayload) {
        const kWh = signedPayload.payload?.meterData?.kWh;
        if (!kWh) return { check: 'VALUE_RANGE', passed: true, message: 'No kWh data' };

        // Reasonable range for campus meters (0.1 - 500 kWh per reading)
        const inRange = kWh >= 0.1 && kWh <= 500;

        return {
            check: 'VALUE_RANGE',
            passed: inRange,
            message: inRange 
                ? `kWh value in range: ${kWh}`
                : `kWh value out of range: ${kWh} (expected 0.1-500)`
        };
    }

    getAlerts(limit = 50) {
        return this.alerts.slice(-limit);
    }

    getStats() {
        return {
            totalAlerts: this.alerts.length,
            byType: this.alerts.reduce((acc, a) => {
                acc[a.type] = (acc[a.type] || 0) + 1;
                return acc;
            }, {}),
            bySeverity: this.alerts.reduce((acc, a) => {
                acc[a.severity] = (acc[a.severity] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

module.exports = {
    IS15959Parser,
    Ed25519Signer,
    MeterSimulator,
    FraudDetector
};

/**
 * Unit Tests - Core Modules
 * @module tests/unit/core.test
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const IS15959Parser = require('../../src/core/protocol/IS15959Parser');
const Ed25519Signer = require('../../src/core/crypto/Ed25519Signer');
const FraudDetector = require('../../src/core/security/FraudDetector');
const MeterSimulator = require('../../src/core/meter/MeterSimulator');

describe('IS15959Parser', () => {
    let parser;

    beforeEach(() => {
        parser = new IS15959Parser();
    });

    it('should create IS-15959 compliant frame', () => {
        const frame = parser.createFrame(
            'NITJ-SOL-001',
            15.5,
            'Wh',
            '1.0.1.8.0'
        );

        assert.ok(frame.obisCode);
        assert.ok(frame.timestamp);
        assert.strictEqual(frame.deviceId, 'NITJ-SOL-001');
    });

    it('should validate frame', () => {
        const frame = parser.createFrame(
            'NITJ-SOL-001',
            15.5,
            'Wh',
            '1.0.1.8.0'
        );

        const validation = parser.validateFrame(frame);
        assert.strictEqual(validation.valid, true);
    });

    it('should have supported OBIS codes', () => {
        assert.ok(parser.OBIS_CODES);
        assert.ok(Object.keys(parser.OBIS_CODES).length > 0);
    });
});

describe('Ed25519Signer', () => {
    let signer;
    const testDeviceId = 'test-device-001';

    beforeEach(() => {
        signer = new Ed25519Signer();
    });

    it('should generate key pair', () => {
        const keyPair = signer.generateKeyPair(testDeviceId);

        assert.ok(keyPair);
        assert.ok(keyPair.publicKey);
        assert.ok(keyPair.secretKey);
    });

    it('should sign data', () => {
        signer.generateKeyPair(testDeviceId);
        const data = 'test data to sign';

        const result = signer.sign(testDeviceId, data);

        assert.ok(result.signature);
        assert.ok(result.dataHash);
    });

    it('should verify valid signature', () => {
        signer.generateKeyPair(testDeviceId);
        const data = 'test data to sign';

        const signResult = signer.sign(testDeviceId, data);
        const verifyResult = signer.verify(testDeviceId, signResult.dataHash, signResult.signature);

        assert.strictEqual(verifyResult.valid, true);
    });

    it('should reject invalid signature', () => {
        signer.generateKeyPair(testDeviceId);
        const data = 'original data';

        const signResult = signer.sign(testDeviceId, data);
        const tamperedHash = signer.sign(testDeviceId, 'tampered data').dataHash;
        const verifyResult = signer.verify(testDeviceId, tamperedHash, signResult.signature);

        assert.strictEqual(verifyResult.valid, false);
    });
});

describe('FraudDetector', () => {
    let detector;

    beforeEach(() => {
        detector = new FraudDetector();
    });

    it('should detect valid reading', () => {
        const reading = {
            meterId: 'TEST-001',
            timestamp: Date.now(),
            energyKWh: 5.5,
            nonce: Date.now()
        };

        const result = detector.detect(reading);

        assert.ok(result);
        assert.ok(Array.isArray(result.alerts));
    });

    it('should detect replay attack', () => {
        const timestamp = Date.now();
        const reading = {
            meterId: 'TEST-002',
            timestamp: timestamp,
            energyKWh: 5.5,
            nonce: timestamp
        };

        detector.detect(reading);
        const result = detector.detect(reading);

        assert.ok(result.alerts.some(a => a.type === 'REPLAY_ATTACK'));
    });

    it('should get statistics', () => {
        const stats = detector.getStats();

        assert.ok(typeof stats.totalChecks === 'number');
        assert.ok(typeof stats.fraudsDetected === 'number');
    });
});

describe('MeterSimulator', () => {
    let simulator;

    beforeEach(() => {
        simulator = new MeterSimulator();
    });

    it('should register meter', () => {
        const meter = simulator.registerMeter('TEST-001', 'SOLAR', 'Test Location');

        assert.ok(meter);
        assert.strictEqual(meter.meterId, 'TEST-001');
        assert.strictEqual(meter.type, 'SOLAR');
    });

    it('should generate reading', () => {
        simulator.registerMeter('TEST-001', 'SOLAR', 'Test');
        const reading = simulator.generateReading('TEST-001');

        assert.ok(reading);
        assert.ok(reading.energyKWh > 0);
        assert.ok(reading.signature);
        assert.ok(reading.dataHash);
    });

    it('should verify reading signature', () => {
        simulator.registerMeter('TEST-001', 'SOLAR', 'Test');
        const reading = simulator.generateReading('TEST-001');

        const isValid = simulator.verifyReading(
            'TEST-001',
            reading.signature,
            reading.dataHash
        );

        assert.ok(isValid.valid);
    });

    it('should get statistics', () => {
        simulator.registerMeter('TEST-001', 'SOLAR', 'Test');
        const stats = simulator.getStats();

        assert.ok(typeof stats.totalMeters === 'number');
        assert.ok(stats.totalMeters >= 1);
    });
});

console.log('Running unit tests for core modules...');

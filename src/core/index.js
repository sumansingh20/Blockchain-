/**
 * Core Module Index
 * Export all core components
 * 
 * @module core
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const IS15959Parser = require('./protocol/IS15959Parser');
const Ed25519Signer = require('./crypto/Ed25519Signer');
const FraudDetector = require('./security/FraudDetector');
const MeterSimulator = require('./meter/MeterSimulator');

module.exports = {
    IS15959Parser,
    Ed25519Signer,
    FraudDetector,
    MeterSimulator,
    FRAUD_TYPES: FraudDetector.FRAUD_TYPES,
    SEVERITY: FraudDetector.SEVERITY,
    METER_TYPES: MeterSimulator.METER_TYPES
};

/**
 * Unit Tests - Services
 * @module tests/unit/services.test
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const TariffManager = require('../../src/services/policy/TariffManager');
const CarbonManager = require('../../src/services/policy/CarbonManager');
const PolicyEngine = require('../../src/services/policy/PolicyEngine');
const CBDCSettlementOrchestrator = require('../../src/services/settlement/CBDCSettlement');

describe('TariffManager', () => {
    let tariffManager;

    beforeEach(() => {
        tariffManager = new TariffManager();
    });

    it('should calculate tariff correctly', () => {
        const result = tariffManager.calculateTariff(10, 'SOLAR');

        assert.ok(result.period);
        assert.ok(result.ratePerKWh > 0);
        assert.ok(result.amounts.totalAmount > 0);
    });

    it('should apply solar discount', () => {
        const solarResult = tariffManager.calculateTariff(10, 'SOLAR');
        const gridResult = tariffManager.calculateTariff(10, 'GRID');

        assert.ok(solarResult.amounts.totalAmount < gridResult.amounts.totalAmount);
    });

    it('should get current rate', () => {
        const rate = tariffManager.getCurrentRate();

        assert.ok(rate.period);
        assert.ok(rate.rate > 0);
        assert.ok(rate.multiplier >= 0.5);
    });

    it('should get statistics', () => {
        tariffManager.calculateTariff(10, 'SOLAR');
        const stats = tariffManager.getStats();

        assert.ok(typeof stats.totalCalculations === 'number');
    });
});

describe('CarbonManager', () => {
    let carbonManager;

    beforeEach(() => {
        carbonManager = new CarbonManager();
    });

    it('should calculate emissions for grid', () => {
        const result = carbonManager.processEnergy(10, 'GRID');

        assert.ok(result.emissions.actual > 0);
        assert.strictEqual(result.source.type, 'GRID');
    });

    it('should have low emissions for solar', () => {
        const result = carbonManager.processEnergy(10, 'SOLAR');

        assert.ok(result.emissions.actual < 1);
        assert.ok(result.certificate);
    });

    it('should generate REC certificate for renewable', () => {
        const result = carbonManager.processEnergy(15, 'SOLAR');

        assert.ok(result.certificate);
        assert.ok(result.certificate.certificateId);
        assert.strictEqual(result.certificate.energyKwh, 15);
    });

    it('should get summary statistics', () => {
        carbonManager.processEnergy(10, 'SOLAR');
        carbonManager.processEnergy(5, 'GRID');
        const summary = carbonManager.getSummary();

        assert.ok(typeof summary.totalEmissionsKg === 'number');
        assert.ok(typeof summary.totalEnergyKwh === 'number');
    });
});

describe('PolicyEngine', () => {
    let policyEngine;

    beforeEach(() => {
        policyEngine = new PolicyEngine();
    });

    it('should process trade', () => {
        const trade = {
            producer: 'SOLAR-001',
            consumer: 'HOSTEL-001',
            kWh: 5,
            sourceType: 'SOLAR',
            timestamp: Date.now()
        };

        const result = policyEngine.processTrade(trade);

        assert.ok(result.success);
        assert.ok(result.tariff);
        assert.ok(result.carbon);
        assert.ok(result.settlement);
    });

    it('should get metrics after trade', () => {
        const trade = {
            producer: 'SOLAR-001',
            consumer: 'HOSTEL-001',
            kWh: 10,
            sourceType: 'SOLAR',
            timestamp: Date.now()
        };

        policyEngine.processTrade(trade);
        const metrics = policyEngine.getMetrics();

        assert.ok(metrics.trades.total >= 1);
        assert.ok(metrics.trades.totalKwh >= 10);
    });

    it('should calculate latency correctly', () => {
        const trade = {
            producer: 'SOLAR-001',
            consumer: 'HOSTEL-001',
            kWh: 5,
            sourceType: 'SOLAR',
            timestamp: Date.now()
        };

        const result = policyEngine.processTrade(trade);
        assert.ok(typeof result.latencyMs === 'number');
    });
});

describe('CBDCSettlementOrchestrator', () => {
    let settlement;

    beforeEach(() => {
        settlement = new CBDCSettlementOrchestrator();
        settlement.initializeEcosystem();
    });

    it('should initialize ecosystem with wallets', () => {
        const wallets = settlement.getRetailWallets();
        const institutions = settlement.getWholesaleInstitutions();

        assert.ok(wallets.length > 0);
        assert.ok(institutions.length > 0);
    });

    it('should execute retail settlement', async () => {
        const trade = { 
            producer: 'SOLAR-001', 
            consumer: 'HOSTEL-001', 
            kWh: 10 
        };
        const policyResult = {
            tariff: { amounts: { totalAmount: 100 } }
        };

        const result = await settlement.executeSettlement(trade, policyResult);

        assert.ok(result.success);
        assert.ok(result.settlement.settlementId);
        assert.ok(result.settlement.legs.length > 0);
    });

    it('should execute wholesale netting', () => {
        const result = settlement.executeWholesaleNetting();

        assert.ok(typeof result.nettingEfficiency === 'number');
        assert.ok(result.settledObligations !== undefined);
    });

    it('should get metrics', () => {
        const metrics = settlement.getMetrics();

        assert.ok(metrics.settlements);
        assert.ok(metrics.performance);
        assert.ok(metrics.ecosystem);
    });

    it('should create wallet', () => {
        const wallet = settlement.createRetailWallet('TEST-WALLET', {
            name: 'Test Wallet',
            entityType: 'CONSUMER'
        });

        assert.ok(wallet);
        assert.strictEqual(wallet.walletId, 'TEST-WALLET');
    });
});

console.log('Running unit tests for services...');

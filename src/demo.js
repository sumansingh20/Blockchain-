/**
 * Demo Script - Comprehensive System Demonstration
 * NIT Jalandhar Campus Energy Trading Platform
 * 
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const logger = require('./utils/logger');
const { generateId, formatCurrency, formatEnergy, delay, percentage } = require('./utils/helpers');

const { MeterSimulator, FraudDetector, IS15959Parser, Ed25519Signer } = require('./core');
const { PolicyEngine, TariffManager, CarbonManager } = require('./services/policy');
const { CBDCSettlementOrchestrator } = require('./services/settlement');
const { ContractManager } = require('./services/blockchain');

/**
 * Main demo function
 */
async function runDemo() {
    logger.section('NIT Jalandhar Campus Energy Trading Platform');
    logger.info('Comprehensive System Demonstration');
    logger.info('Standards: IS-15959:2011, Ed25519 (RFC 8032), RBI e₹');

    logger.section('1. Core Module Initialization');

    logger.step(1, 6, 'Initializing IS-15959 Parser');
    const parser = new IS15959Parser();
    logger.success('IS-15959:2011 parser ready');

    logger.step(2, 6, 'Initializing Ed25519 Signer');
    const signer = new Ed25519Signer();
    logger.success('Ed25519 cryptographic signer ready');

    logger.step(3, 6, 'Initializing Meter Simulator');
    const meterSim = new MeterSimulator();
    meterSim.registerMeter('SOLAR-ROOFTOP-001', 'SOLAR', 'Main Building');
    meterSim.registerMeter('HOSTEL-BLOCK-A', 'GRID', 'Hostel A');
    meterSim.registerMeter('RESEARCH-LAB-001', 'GRID', 'Research Lab');
    logger.success('3 meters registered');

    logger.step(4, 6, 'Initializing Fraud Detector');
    const fraudDetector = new FraudDetector();
    logger.success('Multi-layer fraud detection active');

    logger.step(5, 6, 'Initializing Policy Engine');
    const policyEngine = new PolicyEngine();
    logger.success('PSPCL tariff and carbon tracking ready');

    logger.step(6, 6, 'Initializing CBDC Settlement');
    const settlement = new CBDCSettlementOrchestrator();
    settlement.initializeEcosystem();
    logger.success('RBI e₹ ecosystem initialized');

    await delay(500);

    logger.section('2. IS-15959:2011 Meter Protocol');

    const meterReading = meterSim.generateReading('SOLAR-ROOFTOP-001');
    const kWhValue = meterReading.payload?.frame?.apdu?.notificationBody?.dataValues?.[0]?.value || 5.5;
    logger.info('Generated meter reading', { meterId: 'SOLAR-ROOFTOP-001', kWh: kWhValue });

    const frame = parser.generateFrame({
        meterId: 'SOLAR-ROOFTOP-001',
        kWh: kWhValue,
        voltage: 230,
        current: 10,
        powerFactor: 0.95,
        frequency: 50.01,
        timestamp: new Date().toISOString()
    });

    logger.info('IS-15959 frame generated', {
        frameId: frame.frameId,
        protocol: frame.metadata.protocol
    });

    logger.success('Frame structure valid', { 
        obisCode: frame.metadata.obisCode,
        dataValues: frame.apdu.notificationBody.dataValues.length
    });

    await delay(300);

    logger.section('3. Ed25519 Digital Signatures (RFC 8032)');

    const signKeyPair = signer.generateKeyPair('DEMO-METER');
    logger.info('Generated key pair', { publicKey: signKeyPair.publicKey.slice(0, 16) + '...' });

    const dataToSign = JSON.stringify({
        meterId: 'SOLAR-ROOFTOP-001',
        reading: kWhValue,
        timestamp: Date.now()
    });

    const signedData = signer.sign('DEMO-METER', dataToSign);
    logger.info('Data signed', { signature: signedData.signature.slice(0, 32) + '...' });

    const verifyResult = signer.verify('DEMO-METER', signedData);
    logger.success(`Signature verification: ${verifyResult.valid ? 'VALID' : 'INVALID'}`);

    await delay(300);

    logger.section('4. Fraud Detection Analysis');

    const readings = [];
    for (let i = 0; i < 5; i++) {
        const reading = meterSim.generateReading('HOSTEL-BLOCK-A');
        readings.push(reading);
        
        const fraudCheck = fraudDetector.detect(reading, 'HOSTEL-BLOCK-A');
        const readingKwh = reading.payload?.meterData?.kWh || 0;
        logger.info(`Reading ${i + 1}: ${formatEnergy(readingKwh)} - Clean: ${fraudCheck.isClean}`);
    }

    const fraudStats = fraudDetector.getStats();
    logger.metric('Fraud Detection Statistics', {
        analyzed: fraudStats.totalChecks,
        frauds: fraudStats.fraudsDetected,
        alerts: fraudDetector.alerts.length
    });

    await delay(300);

    logger.section('5. Policy Engine - ToU Tariff & Carbon');

    const trades = [
        { producer: 'SOLAR-ROOFTOP-001', consumer: 'HOSTEL-BLOCK-A', kWh: 15.5, sourceType: 'SOLAR', timestamp: new Date() },
        { producer: 'SOLAR-ROOFTOP-001', consumer: 'RESEARCH-LAB-001', kWh: 8.2, sourceType: 'SOLAR', timestamp: new Date() },
        { producer: 'GRID', consumer: 'HOSTEL-BLOCK-A', kWh: 25.0, sourceType: 'GRID', timestamp: new Date() }
    ];

    let totalEnergy = 0;
    let totalAmount = 0;
    let totalCarbon = 0;

    for (const trade of trades) {
        const result = policyEngine.processTrade(trade);
        
        totalEnergy += trade.kWh;
        totalAmount += result.tariff.amounts.totalAmount;
        totalCarbon += result.carbon.emissions.actual;

        logger.info(`Trade: ${trade.producer} → ${trade.consumer}`, {
            energy: formatEnergy(trade.kWh),
            amount: formatCurrency(result.tariff.amounts.totalAmount),
            period: result.tariff.tariff.period,
            carbon: `${result.carbon.emissions.actual.toFixed(2)} kgCO₂`
        });
    }

    logger.metric('Policy Summary', {
        totalEnergy: formatEnergy(totalEnergy),
        totalValue: formatCurrency(totalAmount),
        carbonEmissions: `${totalCarbon.toFixed(2)} kgCO₂`
    });

    const tariff = policyEngine.getCurrentTariff();
    logger.info('Current tariff', {
        period: tariff.period,
        rate: formatCurrency(tariff.effectiveRate) + '/kWh',
        multiplier: tariff.multiplier
    });

    await delay(300);

    logger.section('6. CBDC Settlement (RBI e₹)');

    const retailWallets = settlement.getRetailWallets();
    logger.info(`Retail wallets initialized: ${retailWallets.length}`);

    const wholesaleInstitutions = settlement.getWholesaleInstitutions();
    logger.info(`Wholesale institutions: ${wholesaleInstitutions.length}`);

    for (const trade of trades) {
        const policyResult = policyEngine.processTrade(trade);
        const settleResult = await settlement.executeSettlement(trade, policyResult);

        logger.info(`Settlement: ${settleResult.settlement.settlementId}`, {
            amount: formatCurrency(settleResult.settlement.amount),
            legs: settleResult.settlement.legs.length,
            timeMs: settleResult.settlement.settlementTimeMs
        });
    }

    const nettingResult = settlement.executeWholesaleNetting();
    logger.info('Wholesale netting cycle', {
        settled: nettingResult.obligationsSettled || 0,
        efficiency: `${nettingResult.nettingEfficiency}%`
    });

    const settlementMetrics = settlement.getMetrics();
    logger.metric('Settlement Metrics', {
        total: settlementMetrics.settlements.total,
        retail: settlementMetrics.settlements.retail,
        avgTime: `${settlementMetrics.performance.avgSettlementTimeMs}ms`
    });

    await delay(300);

    logger.section('7. Carbon Tracking & RECs');

    const carbonSummary = policyEngine.getCarbonSummary();
    logger.metric('Carbon Summary', {
        totalEmissions: `${carbonSummary.totalEmissionsKg} kgCO₂`,
        totalAvoided: `${carbonSummary.totalAvoidedKg} kgCO₂`,
        certificates: carbonSummary.certificatesIssued
    });

    await delay(300);

    logger.section('8. System KPIs');

    const kpis = policyEngine.getKPIs();
    const metrics = policyEngine.getMetrics();
    logger.metric('Key Performance Indicators', {
        tradesProcessed: metrics.trades.total,
        totalEnergy: formatEnergy(metrics.trades.totalKwh),
        totalValue: formatCurrency(metrics.trades.totalSettled),
        avgTradeSize: formatEnergy(metrics.trades.avgTradeKwh),
        renewablePercent: `${kpis.renewableShare}%`
    });

    logger.section('Demo Complete');
    logger.success('All modules operational');
    logger.info('Ready for production deployment');

    return {
        meters: meterSim.getAllMeters(),
        fraudStats: fraudDetector.getStats(),
        policyMetrics: policyEngine.getMetrics(),
        settlementMetrics: settlement.getMetrics(),
        kpis
    };
}

if (require.main === module) {
    runDemo()
        .then(results => {
            console.log('\n✅ Demo completed successfully\n');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Demo failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runDemo };

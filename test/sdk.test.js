/**
 * ============================================
 * COMPREHENSIVE SDK TEST SUITE
 * Edge SDK, Policy Engine, CBDC Settlement Tests
 * ============================================
 * 
 * Tests for all 5 deliverables:
 * 1. Edge SDK (IS-15959, Ed25519)
 * 2. Fraud Detection (replay, clock skew)
 * 3. Policy Engine (ToU, PPA, Carbon)
 * 4. CBDC Settlement (e₹-R, e₹-W)
 * 5. Integration Tests
 */

const { expect } = require('chai');

// Import SDK modules
const { 
    IS15959Parser, 
    Ed25519Signer, 
    MeterSimulator, 
    FraudDetector 
} = require('../sdk/EdgeSDK');

const { 
    ToUTariffManager, 
    PPAContractManager, 
    CarbonTagManager, 
    PolicyEngine 
} = require('../sdk/PolicyEngine');

const { 
    RetailWalletManager, 
    WholesaleNettingModule, 
    CBDCOrchestrator,
    WALLET_TYPES,
    CONDITIONS 
} = require('../sdk/CBDCSettlement');

describe('Edge SDK Tests', function() {
    
    describe('IS-15959 Parser', function() {
        let parser;
        
        beforeEach(function() {
            parser = new IS15959Parser();
        });
        
        it('should generate valid data frame', function() {
            const frame = parser.generateDataFrame({
                meterId: 'SOLAR-001',
                kWh: 25.5,
                timestamp: Date.now(),
                meterType: 'SOLAR'
            });
            
            expect(frame).to.have.property('frameId');
            expect(frame).to.have.property('version', '15959-2011');
            expect(frame).to.have.property('obisCode');
            expect(frame).to.have.property('data');
            expect(frame.data.meterId).to.equal('SOLAR-001');
            expect(frame.data.kWh).to.equal(25.5);
        });
        
        it('should assign correct OBIS codes', function() {
            const solarFrame = parser.generateDataFrame({
                meterId: 'SOLAR-001',
                kWh: 10,
                timestamp: Date.now(),
                meterType: 'SOLAR'
            });
            expect(solarFrame.obisCode).to.equal('1.0.1.8.0');
            
            const gridFrame = parser.generateDataFrame({
                meterId: 'GRID-001',
                kWh: 10,
                timestamp: Date.now(),
                meterType: 'GRID'
            });
            expect(gridFrame.obisCode).to.equal('1.0.2.8.0');
        });
        
        it('should parse frame back to data', function() {
            const original = {
                meterId: 'TEST-001',
                kWh: 50.25,
                timestamp: Date.now(),
                meterType: 'SOLAR'
            };
            
            const frame = parser.generateDataFrame(original);
            const parsed = parser.parseDataFrame(frame);
            
            expect(parsed.meterId).to.equal(original.meterId);
            expect(parsed.kWh).to.equal(original.kWh);
        });
        
        it('should validate frame integrity', function() {
            const frame = parser.generateDataFrame({
                meterId: 'SOLAR-001',
                kWh: 25.5,
                timestamp: Date.now(),
                meterType: 'SOLAR'
            });
            
            expect(parser.validateFrame(frame)).to.be.true;
            
            // Tamper with frame
            frame.data.kWh = 100;
            expect(parser.validateFrame(frame)).to.be.false;
        });
    });
    
    describe('Ed25519 Signer', function() {
        let signer;
        
        beforeEach(function() {
            signer = new Ed25519Signer();
        });
        
        it('should generate key pair', function() {
            const keys = signer.generateKeyPair('TEST-METER-001');
            
            expect(keys).to.have.property('publicKey');
            expect(keys).to.have.property('privateKey');
            expect(keys.publicKey).to.be.a('string');
            expect(keys.privateKey).to.be.a('string');
        });
        
        it('should sign and verify data', function() {
            const meterId = 'SOLAR-001';
            signer.generateKeyPair(meterId);
            
            const data = { kWh: 25.5, timestamp: Date.now() };
            const signature = signer.sign(meterId, data);
            
            expect(signature).to.be.a('string');
            
            const isValid = signer.verify(meterId, data, signature);
            expect(isValid).to.be.true;
        });
        
        it('should detect tampered data', function() {
            const meterId = 'SOLAR-001';
            signer.generateKeyPair(meterId);
            
            const data = { kWh: 25.5, timestamp: Date.now() };
            const signature = signer.sign(meterId, data);
            
            // Tamper with data
            const tamperedData = { kWh: 100, timestamp: Date.now() };
            const isValid = signer.verify(meterId, tamperedData, signature);
            
            expect(isValid).to.be.false;
        });
        
        it('should export and import keys', function() {
            const meterId = 'TEST-METER';
            const original = signer.generateKeyPair(meterId);
            const exported = signer.exportPublicKey(meterId);
            
            expect(exported).to.equal(original.publicKey);
        });
    });
    
    describe('Meter Simulator', function() {
        it('should simulate SOLAR meter readings', function() {
            const simulator = new MeterSimulator('SOLAR-001', 'SOLAR', { peakOutput: 100 });
            const reading = simulator.generateReading();
            
            expect(reading).to.have.property('meterId', 'SOLAR-001');
            expect(reading).to.have.property('meterType', 'SOLAR');
            expect(reading).to.have.property('kWh');
            expect(reading).to.have.property('timestamp');
            expect(reading).to.have.property('signed', true);
            expect(reading.kWh).to.be.at.least(0);
        });
        
        it('should simulate GRID meter readings', function() {
            const simulator = new MeterSimulator('GRID-001', 'GRID', { baseLoad: 50 });
            const reading = simulator.generateReading();
            
            expect(reading.meterType).to.equal('GRID');
            expect(reading.kWh).to.be.at.least(0);
        });
        
        it('should simulate EV_CHARGER readings', function() {
            const simulator = new MeterSimulator('EV-001', 'EV_CHARGER', { maxPower: 22 });
            const reading = simulator.generateReading();
            
            expect(reading.meterType).to.equal('EV_CHARGER');
        });
        
        it('should track cumulative energy', function() {
            const simulator = new MeterSimulator('TEST-001', 'SOLAR');
            
            simulator.generateReading();
            simulator.generateReading();
            simulator.generateReading();
            
            const stats = simulator.getStats();
            expect(stats.readingCount).to.equal(3);
            expect(stats.totalKWh).to.be.at.least(0);
        });
    });
    
    describe('Fraud Detector', function() {
        let detector;
        
        beforeEach(function() {
            detector = new FraudDetector();
        });
        
        it('should detect replay attacks', function() {
            const reading = {
                meterId: 'SOLAR-001',
                kWh: 25.5,
                timestamp: Date.now(),
                signature: 'abc123'
            };
            
            // First reading should pass
            const result1 = detector.checkReading(reading);
            expect(result1.valid).to.be.true;
            
            // Replay should be detected
            const result2 = detector.checkReading(reading);
            expect(result2.valid).to.be.false;
            expect(result2.reason).to.include('Replay');
        });
        
        it('should detect clock skew', function() {
            const futureReading = {
                meterId: 'SOLAR-001',
                kWh: 25.5,
                timestamp: Date.now() + 60000, // 1 minute in future
                signature: 'future123'
            };
            
            const result = detector.checkReading(futureReading);
            expect(result.valid).to.be.false;
            expect(result.reason).to.include('Clock skew');
        });
        
        it('should detect sequence violations', function() {
            const reading1 = {
                meterId: 'SOLAR-001',
                kWh: 100,
                timestamp: Date.now(),
                sequenceNumber: 5,
                signature: 'seq1'
            };
            
            detector.checkReading(reading1);
            
            const reading2 = {
                meterId: 'SOLAR-001',
                kWh: 50,
                timestamp: Date.now() + 1000,
                sequenceNumber: 3, // Out of sequence
                signature: 'seq2'
            };
            
            const result = detector.checkReading(reading2);
            expect(result.valid).to.be.false;
            expect(result.reason).to.include('Sequence');
        });
        
        it('should detect value range violations', function() {
            const extremeReading = {
                meterId: 'SOLAR-001',
                kWh: 999999, // Unrealistic value
                timestamp: Date.now(),
                signature: 'extreme123'
            };
            
            const result = detector.checkReading(extremeReading);
            expect(result.valid).to.be.false;
            expect(result.reason).to.include('range');
        });
        
        it('should provide fraud statistics', function() {
            // Generate some readings
            for (let i = 0; i < 10; i++) {
                detector.checkReading({
                    meterId: `METER-${i}`,
                    kWh: 25 + i,
                    timestamp: Date.now() + i,
                    signature: `sig-${i}`
                });
            }
            
            const stats = detector.getStats();
            expect(stats).to.have.property('totalChecks');
            expect(stats).to.have.property('validCount');
            expect(stats).to.have.property('fraudCount');
            expect(stats.totalChecks).to.equal(10);
        });
    });
});

describe('Policy Engine Tests', function() {
    
    describe('ToU Tariff Manager', function() {
        let tariffManager;
        
        beforeEach(function() {
            tariffManager = new ToUTariffManager();
        });
        
        it('should calculate standard rate', function() {
            // 10 AM on a weekday (standard period)
            const date = new Date();
            date.setHours(10, 0, 0, 0);
            
            const result = tariffManager.calculateTariff(100, date);
            
            expect(result).to.have.property('baseRate');
            expect(result).to.have.property('period');
            expect(result).to.have.property('totalAmount');
            expect(result.totalAmount).to.be.a('number');
        });
        
        it('should apply peak multiplier', function() {
            const peakDate = new Date();
            peakDate.setHours(19, 0, 0, 0); // 7 PM - peak
            
            const offPeakDate = new Date();
            offPeakDate.setHours(3, 0, 0, 0); // 3 AM - off-peak
            
            const peakResult = tariffManager.calculateTariff(100, peakDate);
            const offPeakResult = tariffManager.calculateTariff(100, offPeakDate);
            
            expect(peakResult.totalAmount).to.be.greaterThan(offPeakResult.totalAmount);
        });
        
        it('should apply seasonal adjustments', function() {
            const summerDate = new Date('2025-06-15');
            const winterDate = new Date('2025-12-15');
            
            const summerResult = tariffManager.calculateTariff(100, summerDate);
            const winterResult = tariffManager.calculateTariff(100, winterDate);
            
            // Summer should have surcharge
            expect(summerResult.seasonalFactor).to.be.greaterThan(winterResult.seasonalFactor);
        });
        
        it('should enforce price cap and floor', function() {
            const result = tariffManager.calculateTariff(100);
            
            expect(result.effectiveRate).to.be.at.least(tariffManager.priceFloor);
            expect(result.effectiveRate).to.be.at.most(tariffManager.priceCap);
        });
    });
    
    describe('PPA Contract Manager', function() {
        let ppaManager;
        
        beforeEach(function() {
            ppaManager = new PPAContractManager();
        });
        
        it('should create PPA contract', function() {
            const contract = ppaManager.createContract({
                seller: 'SOLAR-PRODUCER',
                buyer: 'HOSTEL-BLOCK',
                agreedRate: 5.50,
                minKWh: 100,
                maxKWh: 1000,
                validFrom: new Date(),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            });
            
            expect(contract).to.have.property('contractId');
            expect(contract).to.have.property('status', 'ACTIVE');
            expect(contract.agreedRate).to.equal(5.50);
        });
        
        it('should validate trade against contract', function() {
            const contract = ppaManager.createContract({
                seller: 'SOLAR-PRODUCER',
                buyer: 'HOSTEL-BLOCK',
                agreedRate: 5.50,
                minKWh: 100,
                maxKWh: 1000,
                validFrom: new Date(Date.now() - 1000),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            });
            
            const validation = ppaManager.validateTrade(contract.contractId, {
                seller: 'SOLAR-PRODUCER',
                buyer: 'HOSTEL-BLOCK',
                kWh: 500
            });
            
            expect(validation.valid).to.be.true;
        });
        
        it('should reject trade exceeding max kWh', function() {
            const contract = ppaManager.createContract({
                seller: 'SOLAR-PRODUCER',
                buyer: 'HOSTEL-BLOCK',
                agreedRate: 5.50,
                minKWh: 100,
                maxKWh: 1000,
                validFrom: new Date(Date.now() - 1000),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            });
            
            const validation = ppaManager.validateTrade(contract.contractId, {
                seller: 'SOLAR-PRODUCER',
                buyer: 'HOSTEL-BLOCK',
                kWh: 5000 // Exceeds max
            });
            
            expect(validation.valid).to.be.false;
        });
        
        it('should calculate settlement amount', function() {
            const contract = ppaManager.createContract({
                seller: 'SOLAR-PRODUCER',
                buyer: 'HOSTEL-BLOCK',
                agreedRate: 5.50,
                minKWh: 100,
                maxKWh: 1000,
                validFrom: new Date(Date.now() - 1000),
                validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            });
            
            const settlement = ppaManager.calculateSettlement(contract.contractId, 200);
            
            expect(settlement.amount).to.equal(200 * 5.50);
        });
    });
    
    describe('Carbon Tag Manager', function() {
        let carbonManager;
        
        beforeEach(function() {
            carbonManager = new CarbonTagManager();
        });
        
        it('should tag SOLAR as zero carbon', function() {
            const tag = carbonManager.tagEnergy('SOLAR', 100);
            
            expect(tag.carbonTag).to.equal('SOLAR');
            expect(tag.co2Kg).to.equal(0);
            expect(tag.discount).to.be.greaterThan(0);
        });
        
        it('should calculate GRID carbon emissions', function() {
            const tag = carbonManager.tagEnergy('GRID', 100);
            
            expect(tag.carbonTag).to.equal('GRID');
            expect(tag.co2Kg).to.be.greaterThan(0);
            expect(tag.intensity).to.equal(0.82); // kg CO2/kWh
        });
        
        it('should calculate HYBRID emissions', function() {
            const tag = carbonManager.tagEnergy('HYBRID', 100, { solarRatio: 0.5 });
            
            expect(tag.carbonTag).to.equal('HYBRID');
            expect(tag.co2Kg).to.be.lessThan(100 * 0.82); // Less than pure grid
        });
        
        it('should generate REC certificates', function() {
            const rec = carbonManager.generateREC('SOLAR', 1000, 'SOLAR-001');
            
            expect(rec).to.have.property('recId');
            expect(rec).to.have.property('kWh', 1000);
            expect(rec).to.have.property('status', 'ISSUED');
        });
        
        it('should track cumulative carbon metrics', function() {
            carbonManager.tagEnergy('SOLAR', 100);
            carbonManager.tagEnergy('GRID', 50);
            carbonManager.tagEnergy('HYBRID', 75);
            
            const metrics = carbonManager.getMetrics();
            
            expect(metrics).to.have.property('totalKWh');
            expect(metrics).to.have.property('totalCO2');
            expect(metrics).to.have.property('co2Avoided');
            expect(metrics.totalKWh).to.equal(225);
        });
    });
    
    describe('Policy Engine Integration', function() {
        let policyEngine;
        
        beforeEach(function() {
            policyEngine = new PolicyEngine();
        });
        
        it('should process complete trade', function() {
            const trade = {
                producer: 'SOLAR-001',
                consumer: 'HOSTEL-BLOCK',
                kWh: 50,
                sourceType: 'SOLAR',
                timestamp: new Date()
            };
            
            const result = policyEngine.processTrade(trade);
            
            expect(result).to.have.property('tariff');
            expect(result).to.have.property('carbon');
            expect(result).to.have.property('totalAmount');
            expect(result).to.have.property('settlementReady', true);
        });
        
        it('should apply carbon discount for solar', function() {
            const solarTrade = {
                producer: 'SOLAR-001',
                consumer: 'HOSTEL-BLOCK',
                kWh: 100,
                sourceType: 'SOLAR',
                timestamp: new Date()
            };
            
            const gridTrade = {
                producer: 'GRID-001',
                consumer: 'HOSTEL-BLOCK',
                kWh: 100,
                sourceType: 'GRID',
                timestamp: new Date()
            };
            
            const solarResult = policyEngine.processTrade(solarTrade);
            const gridResult = policyEngine.processTrade(gridTrade);
            
            // Solar should be cheaper due to carbon discount
            expect(solarResult.totalAmount).to.be.lessThan(gridResult.totalAmount);
        });
    });
});

describe('CBDC Settlement Tests', function() {
    
    describe('Retail Wallet Manager (e₹-R)', function() {
        let walletManager;
        
        beforeEach(function() {
            walletManager = new RetailWalletManager();
        });
        
        it('should create retail wallet', function() {
            const wallet = walletManager.createWallet('USER-001', {
                name: 'Test User',
                role: 'CONSUMER',
                kycVerified: true
            });
            
            expect(wallet).to.have.property('walletId');
            expect(wallet.type).to.equal('e₹-R');
            expect(wallet.kycStatus).to.equal('VERIFIED');
            expect(wallet.balance).to.equal(0);
        });
        
        it('should top up wallet', function() {
            const wallet = walletManager.createWallet('USER-001', { name: 'Test' });
            const tx = walletManager.topUp(wallet.walletId, 10000);
            
            expect(tx.type).to.equal('TOP_UP');
            expect(tx.amount).to.equal(10000);
            
            const updated = walletManager.getWallet(wallet.walletId);
            expect(updated.balance).to.equal(10000);
        });
        
        it('should create escrow', function() {
            const wallet = walletManager.createWallet('USER-001', { name: 'Test' });
            walletManager.topUp(wallet.walletId, 10000);
            
            const escrow = walletManager.createEscrow(wallet.walletId, 5000, 'ENERGY_TRADE');
            
            expect(escrow.status).to.equal('LOCKED');
            expect(escrow.amount).to.equal(5000);
            
            const updated = walletManager.getWallet(wallet.walletId);
            expect(updated.availableBalance).to.equal(5000);
            expect(updated.lockedBalance).to.equal(5000);
        });
        
        it('should release escrow to recipient', function() {
            const sender = walletManager.createWallet('SENDER', { name: 'Sender', role: 'CONSUMER' });
            const receiver = walletManager.createWallet('RECEIVER', { name: 'Receiver', role: 'TREASURY' });
            
            walletManager.topUp(sender.walletId, 10000);
            const escrow = walletManager.createEscrow(sender.walletId, 5000, 'ENERGY_TRADE');
            
            const tx = walletManager.releaseEscrow(escrow.escrowId, receiver.walletId);
            
            expect(tx.status).to.equal('COMPLETED');
            expect(tx).to.have.property('cbdcRef');
            
            const updatedReceiver = walletManager.getWallet(receiver.walletId);
            expect(updatedReceiver.balance).to.equal(5000);
        });
        
        it('should enforce ENERGY_ONLY condition', function() {
            const wallet = walletManager.createWallet('USER-001', { name: 'Test', kycVerified: true });
            walletManager.topUp(wallet.walletId, 10000);
            walletManager.addCondition(wallet.walletId, 'ENERGY_ONLY');
            
            // Creating escrow for energy should work
            const escrow = walletManager.createEscrow(wallet.walletId, 1000, 'ENERGY_TRADE');
            expect(escrow.conditions).to.include('ENERGY_ONLY');
        });
        
        it('should enforce daily limits', function() {
            const wallet = walletManager.createWallet('USER-001', { name: 'Test' });
            wallet.dailyLimit = 1000; // Low limit for testing
            walletManager.topUp(wallet.walletId, 10000);
            
            const receiver = walletManager.createWallet('RECEIVER', { name: 'Receiver' });
            
            // First transfer should work
            walletManager.transfer(wallet.walletId, receiver.walletId, 800, 'ENERGY_TRADE');
            
            // Second transfer should fail (exceeds daily limit)
            expect(() => {
                walletManager.transfer(wallet.walletId, receiver.walletId, 500, 'ENERGY_TRADE');
            }).to.throw('Daily limit exceeded');
        });
    });
    
    describe('Wholesale Netting Module (e₹-W)', function() {
        let nettingModule;
        
        beforeEach(function() {
            nettingModule = new WholesaleNettingModule();
        });
        
        it('should register institutions', function() {
            const institution = nettingModule.registerInstitution('NITJ_TREASURY', {
                name: 'NIT Jalandhar Treasury',
                initialBalance: 1000000
            });
            
            expect(institution.type).to.equal('e₹-W');
            expect(institution.balance).to.equal(1000000);
        });
        
        it('should record positions', function() {
            nettingModule.registerInstitution('INSTITUTION_A', { name: 'A', initialBalance: 100000 });
            nettingModule.registerInstitution('INSTITUTION_B', { name: 'B', initialBalance: 100000 });
            
            const position = nettingModule.recordPosition('INSTITUTION_A', 'INSTITUTION_B', 5000, 'REF-001');
            
            expect(position.status).to.equal('PENDING');
            
            const instA = nettingModule.getInstitution('INSTITUTION_A');
            const instB = nettingModule.getInstitution('INSTITUTION_B');
            
            expect(instA.netPosition).to.equal(-5000);
            expect(instB.netPosition).to.equal(5000);
        });
        
        it('should execute multilateral netting', function() {
            nettingModule.registerInstitution('A', { name: 'A', initialBalance: 100000 });
            nettingModule.registerInstitution('B', { name: 'B', initialBalance: 100000 });
            nettingModule.registerInstitution('C', { name: 'C', initialBalance: 100000 });
            
            // Create circular positions
            nettingModule.recordPosition('A', 'B', 10000, 'REF-1');
            nettingModule.recordPosition('B', 'C', 8000, 'REF-2');
            nettingModule.recordPosition('C', 'A', 5000, 'REF-3');
            
            nettingModule.startNettingCycle();
            const cycle = nettingModule.executeNetting();
            
            expect(cycle.status).to.equal('COMPLETED');
            expect(cycle).to.have.property('nettingEfficiency');
            expect(parseFloat(cycle.nettingEfficiency)).to.be.greaterThan(0);
        });
        
        it('should calculate netting efficiency', function() {
            nettingModule.registerInstitution('A', { name: 'A', initialBalance: 100000 });
            nettingModule.registerInstitution('B', { name: 'B', initialBalance: 100000 });
            
            // Positions that largely offset
            nettingModule.recordPosition('A', 'B', 10000, 'REF-1');
            nettingModule.recordPosition('B', 'A', 9000, 'REF-2');
            
            nettingModule.startNettingCycle();
            const cycle = nettingModule.executeNetting();
            
            // High efficiency because positions offset
            expect(parseFloat(cycle.nettingEfficiency)).to.be.greaterThan(50);
        });
    });
    
    describe('CBDC Orchestrator', function() {
        let orchestrator;
        
        beforeEach(function() {
            orchestrator = new CBDCOrchestrator();
            orchestrator.initializeEcosystem();
        });
        
        it('should initialize ecosystem with wallets and institutions', function() {
            const retailWallets = orchestrator.getRetailWallets();
            const institutions = orchestrator.getWholesaleInstitutions();
            
            expect(retailWallets.length).to.be.greaterThan(0);
            expect(institutions.length).to.be.greaterThan(0);
        });
        
        it('should execute complete settlement', async function() {
            const trade = {
                producer: 'SOLAR-001',
                consumer: 'HOSTEL-BLOCK',
                kWh: 50,
                timestamp: new Date()
            };
            
            const tariffResult = {
                totalAmount: 339.50,
                effectiveRate: 6.79
            };
            
            const result = await orchestrator.executeSettlement(trade, tariffResult);
            
            expect(result.success).to.be.true;
            expect(result.settlement).to.have.property('legs');
            expect(result.settlement.legs.length).to.equal(2);
            expect(result.settlement.legs[0].rail).to.equal('e₹-R');
            expect(result.settlement.legs[1].rail).to.equal('e₹-W');
        });
        
        it('should provide settlement metrics', async function() {
            // Execute a few settlements
            for (let i = 0; i < 5; i++) {
                await orchestrator.executeSettlement(
                    { producer: 'P', consumer: 'C', kWh: 10 },
                    { totalAmount: 67.90 }
                );
            }
            
            const metrics = orchestrator.getMetrics();
            
            expect(metrics.retail.totalTransactions).to.be.greaterThan(0);
            expect(metrics.performance).to.have.property('avgSettlementTimeMs');
            expect(metrics.performance).to.have.property('p50SettlementTimeMs');
        });
    });
});

describe('Integration Tests', function() {
    
    describe('End-to-End Energy Trade Flow', function() {
        it('should complete full trade cycle: Meter → Token → Settlement', async function() {
            // 1. Generate meter reading
            const simulator = new MeterSimulator('SOLAR-001', 'SOLAR', { peakOutput: 100 });
            const reading = simulator.generateReading();
            
            expect(reading).to.have.property('kWh');
            expect(reading).to.have.property('signed', true);
            
            // 2. Verify reading (fraud detection)
            const detector = new FraudDetector();
            const verification = detector.checkReading({
                ...reading,
                signature: reading.dataFrame?.signature || 'test-sig'
            });
            
            expect(verification.valid).to.be.true;
            
            // 3. Process through policy engine
            const policyEngine = new PolicyEngine();
            const trade = {
                producer: reading.meterId,
                consumer: 'HOSTEL-BLOCK',
                kWh: reading.kWh,
                sourceType: reading.meterType,
                timestamp: new Date(reading.timestamp)
            };
            
            const policyResult = policyEngine.processTrade(trade);
            
            expect(policyResult.settlementReady).to.be.true;
            expect(policyResult).to.have.property('totalAmount');
            
            // 4. Execute CBDC settlement
            const orchestrator = new CBDCOrchestrator();
            orchestrator.initializeEcosystem();
            
            const settlement = await orchestrator.executeSettlement(trade, policyResult);
            
            expect(settlement.success).to.be.true;
            expect(settlement.settlement).to.have.property('auditTrail');
        });
    });
    
    describe('Fault Injection Tests', function() {
        it('should handle replay attack gracefully', function() {
            const detector = new FraudDetector();
            
            const reading = {
                meterId: 'TEST-001',
                kWh: 25.5,
                timestamp: Date.now(),
                signature: 'test-signature'
            };
            
            // First attempt
            const result1 = detector.checkReading(reading);
            expect(result1.valid).to.be.true;
            
            // Replay attempt
            const result2 = detector.checkReading(reading);
            expect(result2.valid).to.be.false;
            expect(result2.fraudType).to.equal('REPLAY');
        });
        
        it('should handle clock skew gracefully', function() {
            const detector = new FraudDetector();
            
            const futureReading = {
                meterId: 'TEST-001',
                kWh: 25.5,
                timestamp: Date.now() + 30000, // 30 seconds in future
                signature: 'future-sig'
            };
            
            const result = detector.checkReading(futureReading);
            expect(result.valid).to.be.false;
            expect(result.fraudType).to.equal('CLOCK_SKEW');
        });
        
        it('should handle insufficient balance', function() {
            const walletManager = new RetailWalletManager();
            const wallet = walletManager.createWallet('POOR-USER', { name: 'Poor User' });
            walletManager.topUp(wallet.walletId, 100); // Only ₹100
            
            expect(() => {
                walletManager.createEscrow(wallet.walletId, 1000, 'ENERGY_TRADE');
            }).to.throw('Insufficient balance');
        });
        
        it('should handle invalid contract reference', function() {
            const ppaManager = new PPAContractManager();
            
            const validation = ppaManager.validateTrade('INVALID-CONTRACT', {
                seller: 'A',
                buyer: 'B',
                kWh: 100
            });
            
            expect(validation.valid).to.be.false;
            expect(validation.reason).to.include('not found');
        });
        
        it('should handle expired PPA contract', function() {
            const ppaManager = new PPAContractManager();
            
            const contract = ppaManager.createContract({
                seller: 'SOLAR',
                buyer: 'HOSTEL',
                agreedRate: 5.50,
                minKWh: 10,
                maxKWh: 1000,
                validFrom: new Date('2020-01-01'),
                validTo: new Date('2020-12-31') // Expired
            });
            
            const validation = ppaManager.validateTrade(contract.contractId, {
                seller: 'SOLAR',
                buyer: 'HOSTEL',
                kWh: 100
            });
            
            expect(validation.valid).to.be.false;
            expect(validation.reason).to.include('expired');
        });
    });
});

// Run with: npx mocha test/sdk.test.js --timeout 10000

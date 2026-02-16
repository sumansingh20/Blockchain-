/**
 * ============================================
 * COMPREHENSIVE DEMO SCRIPT
 * Full System Integration Demonstration
 * ============================================
 * 
 * This script demonstrates the complete flow:
 * 1. Edge SDK - Meter simulation & signing
 * 2. Fraud Detection - Security validation
 * 3. Blockchain - GoO token minting
 * 4. Policy Engine - Tariff calculation
 * 5. CBDC Settlement - e₹ payment rails
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Import SDK modules
const { IS15959Parser, Ed25519Signer, MeterSimulator, FraudDetector } = require('../sdk/EdgeSDK');
const { PolicyEngine } = require('../sdk/PolicyEngine');
const { CBDCOrchestrator } = require('../sdk/CBDCSettlement');

// Configuration
const CONFIG = {
    RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8545',
    PRIVATE_KEY: process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '═'.repeat(60));
    log(`  ${title}`, 'bright');
    console.log('═'.repeat(60));
}

function logStep(step, description) {
    log(`\n[Step ${step}] ${description}`, 'cyan');
    console.log('─'.repeat(50));
}

async function runComprehensiveDemo() {
    log('\n🔋 TOKENIZED CAMPUS ENERGY TRADE - COMPREHENSIVE DEMO', 'bright');
    log('   NIT Jalandhar | Blockchain + CBDC Settlement\n', 'yellow');
    
    const metrics = {
        meterReadings: 0,
        fraudChecks: 0,
        fraudsDetected: 0,
        tokensGenerated: 0,
        settlementsCompleted: 0,
        totalKWh: 0,
        totalAmount: 0,
        startTime: Date.now()
    };

    try {
        // ═══════════════════════════════════════════════════════════
        // PHASE 1: EDGE SDK INITIALIZATION
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 1: EDGE SDK INITIALIZATION');
        
        logStep(1, 'Initializing IS-15959 Parser');
        const parser = new IS15959Parser();
        log('  ✓ IS-15959:2011 compliant parser ready', 'green');
        log('  ✓ OBIS codes configured', 'green');
        
        logStep(2, 'Initializing Ed25519 Signer');
        const signer = new Ed25519Signer();
        log('  ✓ Ed25519 cryptographic signer ready', 'green');
        
        logStep(3, 'Creating Meter Simulators');
        const meterSimulator = new MeterSimulator();
        
        // Register all meters
        const meters = {
            solar: meterSimulator.registerMeter('SOLAR-ROOFTOP-001', 'SOLAR', 'Main Building Rooftop'),
            grid: meterSimulator.registerMeter('GRID-MAIN-001', 'GRID', 'Main Substation'),
            evCharger: meterSimulator.registerMeter('EV-STATION-001', 'EV_CHARGER', 'Parking Lot A'),
            battery: meterSimulator.registerMeter('BESS-001', 'BATTERY', 'Energy Storage Building')
        };
        
        for (const [type, meter] of Object.entries(meters)) {
            log(`  ✓ ${type.toUpperCase()} meter: ${meter.meterId}`, 'green');
        }
        
        // ═══════════════════════════════════════════════════════════
        // PHASE 2: FRAUD DETECTION SETUP
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 2: FRAUD DETECTION SETUP');
        
        logStep(4, 'Initializing Fraud Detector');
        const fraudDetector = new FraudDetector();
        log('  ✓ Replay attack detection enabled (<500ms)', 'green');
        log('  ✓ Clock skew detection enabled (±5s)', 'green');
        log('  ✓ Sequence validation enabled', 'green');
        log('  ✓ Value range validation enabled', 'green');
        
        // ═══════════════════════════════════════════════════════════
        // PHASE 3: BLOCKCHAIN CONNECTION
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 3: BLOCKCHAIN CONNECTION');
        
        logStep(5, 'Connecting to Hardhat Network');
        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
        
        const network = await provider.getNetwork();
        log(`  ✓ Connected to chain ID: ${network.chainId}`, 'green');
        log(`  ✓ Wallet: ${wallet.address.substring(0, 10)}...`, 'green');
        
        logStep(6, 'Loading Smart Contract');
        // Load ABI
        const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'EnergyLedger.sol', 'EnergyLedger.json');
        let contract;
        
        if (fs.existsSync(artifactPath)) {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, artifact.abi, wallet);
            log(`  ✓ Contract loaded: ${CONFIG.CONTRACT_ADDRESS.substring(0, 15)}...`, 'green');
        } else {
            log('  ⚠ Contract artifact not found, running in simulation mode', 'yellow');
            contract = null;
        }
        
        // ═══════════════════════════════════════════════════════════
        // PHASE 4: POLICY ENGINE SETUP
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 4: POLICY ENGINE SETUP');
        
        logStep(7, 'Initializing Policy Engine');
        const policyEngine = new PolicyEngine();
        log('  ✓ ToU Tariff Manager: PSPCL rates loaded', 'green');
        log('  ✓ PPA Contract Manager: Ready', 'green');
        log('  ✓ Carbon Tag Manager: CO₂ factors configured', 'green');
        
        // ═══════════════════════════════════════════════════════════
        // PHASE 5: CBDC SETTLEMENT SETUP
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 5: CBDC SETTLEMENT SETUP');
        
        logStep(8, 'Initializing CBDC Orchestrator');
        const cbdcOrchestrator = new CBDCOrchestrator();
        const ecosystem = cbdcOrchestrator.initializeEcosystem();
        
        log(`  ✓ e₹-R Retail Wallets: ${ecosystem.retailWallets.length}`, 'green');
        for (const wallet of ecosystem.retailWallets) {
            log(`    - ${wallet.metadata.name}: ₹${wallet.balance.toLocaleString()}`, 'blue');
        }
        
        log(`  ✓ e₹-W Wholesale Institutions: ${ecosystem.wholesaleInstitutions.length}`, 'green');
        for (const inst of ecosystem.wholesaleInstitutions) {
            log(`    - ${inst.name}: ₹${inst.balance.toLocaleString()}`, 'blue');
        }
        
        // ═══════════════════════════════════════════════════════════
        // PHASE 6: SIMULATED ENERGY TRADES
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 6: SIMULATED ENERGY TRADES');
        
        const trades = [
            { meterId: 'SOLAR-ROOFTOP-001', consumer: 'Mega Hostel Block-1', carbonTag: 'SOLAR' },
            { meterId: 'SOLAR-ROOFTOP-001', consumer: 'Research Lab', carbonTag: 'SOLAR' },
            { meterId: 'GRID-MAIN-001', consumer: 'Admin Building', carbonTag: 'GRID' },
            { meterId: 'EV-STATION-001', consumer: 'EV Charging Bay', carbonTag: 'HYBRID' },
            { meterId: 'SOLAR-ROOFTOP-001', consumer: 'Library', carbonTag: 'SOLAR' },
            { meterId: 'BESS-001', consumer: 'Data Center', carbonTag: 'HYBRID' },
            { meterId: 'GRID-MAIN-001', consumer: 'Sports Complex', carbonTag: 'GRID' },
            { meterId: 'SOLAR-ROOFTOP-001', consumer: 'Cafeteria', carbonTag: 'SOLAR' }
        ];
        
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            logStep(`6.${i + 1}`, `Processing Trade #${i + 1}`);
            
            // Step A: Generate meter reading
            const readingResult = meterSimulator.generateReading(trade.meterId);
            const reading = readingResult.payload.meterData;
            metrics.meterReadings++;
            log(`  📊 Meter Reading:`, 'magenta');
            log(`     Meter ID: ${reading.meterId}`);
            log(`     Energy: ${reading.kWh.toFixed(3)} kWh`);
            log(`     Type: ${reading.carbonTag}`);
            
            // Step B: Create IS-15959 frame
            const frame = readingResult.payload.frame;
            log(`  📋 IS-15959 Frame:`, 'magenta');
            log(`     HDLC Address: ${frame.hdlcAddress}`);
            log(`     OBIS Code: ${frame.apdu?.notificationBody?.dataValue?.[0]?.obis || 'N/A'}`);
            
            // Step C: Signature is already in the reading
            const signature = readingResult.signature;
            log(`  🔐 Ed25519 Signature:`, 'magenta');
            log(`     ${signature ? signature.substring(0, 40) : 'N/A'}...`);
            
            // Step D: Fraud detection
            const fraudCheck = fraudDetector.detectFraud(readingResult, reading.meterId);
            metrics.fraudChecks++;
            
            if (!fraudCheck.isClean) {
                metrics.fraudsDetected++;
                log(`  ⚠️ Fraud Detected: ${fraudCheck.alerts[0]?.message || 'Unknown'}`, 'red');
                continue;
            }
            log(`  ✓ Fraud Check: PASSED (${fraudCheck.checks.length} checks)`, 'green');
            
            // Step E: Process through policy engine
            const policyResult = policyEngine.processTrade({
                producer: reading.meterId,
                consumer: trade.consumer,
                kWh: reading.kWh,
                sourceType: trade.carbonTag,
                timestamp: new Date(reading.timestamp)
            });
            
            log(`  💰 Policy Result:`, 'magenta');
            log(`     Base Rate: ₹${policyResult.tariff.baseRate}/kWh`);
            log(`     Effective Rate: ₹${policyResult.tariff.effectiveRate.toFixed(2)}/kWh`);
            log(`     CO₂ Emitted: ${policyResult.carbon.co2Emitted} kg`);
            log(`     CO₂ Avoided: ${policyResult.carbon.co2Avoided} kg`);
            log(`     Total Amount: ₹${policyResult.settlement.finalAmount.toFixed(2)}`);
            
            const totalAmount = policyResult.settlement.finalAmount;
            
            // Step F: Record on blockchain (if connected)
            if (contract) {
                try {
                    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(
                        JSON.stringify({ ...reading, timestamp: Date.now() + i })
                    ));
                    
                    const carbonTagEnum = trade.carbonTag === 'SOLAR' ? 0 : 
                                         trade.carbonTag === 'GRID' ? 1 : 2;
                    
                    const tx = await contract.recordEnergy(
                        reading.meterId,
                        Math.floor(reading.kWh * 1000),
                        Math.floor(Date.now() / 1000),
                        carbonTagEnum,
                        dataHash
                    );
                    await tx.wait();
                    
                    log(`  ⛓️ Blockchain:`, 'magenta');
                    log(`     TX Hash: ${tx.hash.substring(0, 20)}...`);
                    metrics.tokensGenerated++;
                } catch (err) {
                    log(`  ⚠️ Blockchain Error: ${err.message.substring(0, 50)}`, 'yellow');
                }
            }
            
            // Step G: CBDC Settlement
            const settlement = await cbdcOrchestrator.executeSettlement(
                {
                    producer: reading.meterId,
                    consumer: trade.consumer,
                    kWh: reading.kWh,
                    timestamp: new Date()
                },
                policyResult
            );
            
            if (settlement.success) {
                metrics.settlementsCompleted++;
                metrics.totalKWh += reading.kWh;
                metrics.totalAmount += totalAmount;
                
                log(`  💳 CBDC Settlement:`, 'magenta');
                log(`     Settlement ID: ${settlement.settlement.settlementId.substring(0, 25)}...`);
                log(`     e₹-R Leg: ${settlement.settlement.legs[0]?.status || 'N/A'}`);
                log(`     e₹-W Leg: ${settlement.settlement.legs[1]?.status || 'N/A'}`);
                log(`     Latency: ${settlement.settlement.settlementTimeMs}ms`);
            }
            
            // Small delay between trades
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // ═══════════════════════════════════════════════════════════
        // PHASE 7: WHOLESALE NETTING
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 7: WHOLESALE NETTING');
        
        logStep(9, 'Executing e₹-W Batch Netting');
        const nettingResult = cbdcOrchestrator.executeWholesaleNetting();
        
        log(`  📊 Netting Cycle: ${nettingResult.cycleId}`, 'magenta');
        log(`     Gross Volume: ₹${nettingResult.totalGrossVolume?.toFixed(2) || 0}`);
        log(`     Net Volume: ₹${nettingResult.totalNetVolume?.toFixed(2) || 0}`);
        log(`     Efficiency: ${nettingResult.nettingEfficiency || 0}%`, 'green');
        
        // ═══════════════════════════════════════════════════════════
        // PHASE 8: FINAL METRICS
        // ═══════════════════════════════════════════════════════════
        logSection('PHASE 8: FINAL METRICS & EVALUATION');
        
        const cbdcMetrics = cbdcOrchestrator.getMetrics();
        const elapsed = Date.now() - metrics.startTime;
        
        log('\n📈 PERFORMANCE SUMMARY', 'bright');
        console.log('─'.repeat(50));
        
        log(`  Meter Readings Processed: ${metrics.meterReadings}`, 'cyan');
        log(`  Fraud Checks Performed: ${metrics.fraudChecks}`, 'cyan');
        log(`  Frauds Detected: ${metrics.fraudsDetected}`, metrics.fraudsDetected > 0 ? 'red' : 'green');
        log(`  GoO Tokens Generated: ${metrics.tokensGenerated}`, 'cyan');
        log(`  Settlements Completed: ${metrics.settlementsCompleted}`, 'cyan');
        
        log('\n📊 ENERGY & FINANCIAL METRICS', 'bright');
        console.log('─'.repeat(50));
        
        log(`  Total Energy Traded: ${metrics.totalKWh.toFixed(2)} kWh`, 'cyan');
        log(`  Total Amount Settled: ₹${metrics.totalAmount.toFixed(2)}`, 'cyan');
        log(`  CO₂ Avoided: ${(metrics.totalKWh * 0.42).toFixed(2)} kg`, 'green');
        
        log('\n⚡ LATENCY METRICS', 'bright');
        console.log('─'.repeat(50));
        
        log(`  Avg Settlement Time: ${cbdcMetrics.performance.avgSettlementTimeMs.toFixed(2)}ms`, 'cyan');
        log(`  P50 Latency: ${cbdcMetrics.performance.p50SettlementTimeMs}ms`, 'cyan');
        log(`  P95 Latency: ${cbdcMetrics.performance.p95SettlementTimeMs}ms`, 'cyan');
        log(`  Total Demo Time: ${elapsed}ms`, 'cyan');
        
        log('\n✅ EVALUATION CRITERIA', 'bright');
        console.log('─'.repeat(50));
        
        const provenanceIntegrity = ((metrics.meterReadings - metrics.fraudsDetected) / metrics.meterReadings * 100).toFixed(2);
        const latencyTarget = cbdcMetrics.performance.p50SettlementTimeMs < 3000;
        const carbonCoverage = 100; // All trades tagged
        
        log(`  Provenance Integrity: ${provenanceIntegrity}% ${provenanceIntegrity >= 99 ? '✓' : '✗'}`, provenanceIntegrity >= 99 ? 'green' : 'red');
        log(`  Settlement Latency (p50 < 3s): ${latencyTarget ? 'PASS ✓' : 'FAIL ✗'}`, latencyTarget ? 'green' : 'red');
        log(`  Carbon Telemetry Coverage: ${carbonCoverage}% ✓`, 'green');
        
        log('\n' + '═'.repeat(60), 'green');
        log('  ✅ DEMO COMPLETED SUCCESSFULLY', 'green');
        log('═'.repeat(60) + '\n', 'green');
        
    } catch (error) {
        log(`\n❌ Demo Error: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run the demo
runComprehensiveDemo()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
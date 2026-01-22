/**
 * ============================================
 * MAIN BACKEND SERVER
 * ============================================
 * Express.js server that orchestrates:
 * - Smart meter data ingestion
 * - Blockchain recording
 * - Policy engine pricing
 * - CBDC settlement
 * 
 * This is the "BRAIN" of the system
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const blockchainService = require('./blockchain');
const policyEngine = require('./policyEngine');
const { CBDCWalletManager } = require('./cbdcWallet');

// ============ INITIALIZATION ============

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize CBDC Wallet Manager
const walletManager = new CBDCWalletManager();

// In-memory storage for demo (use database in production)
const dataStore = {
    receipts: [],
    tokens: [],
    settlements: [],
    meterReadings: []
};

// ============ MIDDLEWARE ============

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        blockchain: blockchainService.isConnected ? 'connected' : 'disconnected'
    });
});

// ============ ENERGY API ROUTES ============

/**
 * POST /api/energy/record
 * Record energy data from smart meter
 * 
 * Flow:
 * 1. Validate meter data
 * 2. Record on blockchain
 * 3. Mint energy token
 * 4. Calculate price via policy engine
 * 5. Execute CBDC settlement
 * 6. Record settlement on blockchain
 */
app.post('/api/energy/record', async (req, res) => {
    try {
        const meterData = req.body;
        
        console.log('\n' + '='.repeat(50));
        console.log('📥 INCOMING METER DATA');
        console.log('='.repeat(50));
        console.log(JSON.stringify(meterData, null, 2));
        
        // Step 1: Validate meter data
        const validation = policyEngine.validateMeterData(meterData);
        if (!validation.valid) {
            console.log('❌ Validation failed:', validation.errors);
            return res.status(400).json({
                success: false,
                error: 'Invalid meter data',
                details: validation.errors
            });
        }
        console.log('✅ Step 1: Data validated');
        
        // Step 2: Check for replay attack
        const isReplay = await blockchainService.isDataHashUsed(meterData.dataHash);
        if (isReplay) {
            console.log('❌ Replay attack detected!');
            return res.status(400).json({
                success: false,
                error: 'Duplicate data rejected (replay attack prevention)'
            });
        }
        console.log('✅ Step 2: No replay attack');
        
        // Step 3: Record on blockchain
        const kWhScaled = meterData.kWhScaled || Math.round(meterData.kWh * 1000);
        const blockchainReceipt = await blockchainService.recordEnergy(
            meterData.meterId,
            kWhScaled,
            meterData.timestamp,
            meterData.carbonTag,
            meterData.dataHash
        );
        console.log('✅ Step 3: Blockchain receipt created');
        
        // Step 4: Mint energy token
        const tokenResult = await blockchainService.mintToken(blockchainReceipt.receiptId);
        console.log('✅ Step 4: Energy token minted');
        
        // Step 5: Calculate price using policy engine
        const pricing = policyEngine.calculatePrice(
            meterData.kWh,
            meterData.timestamp,
            meterData.carbonTag
        );
        console.log('✅ Step 5: Price calculated:', pricing.finalAmountINR);
        
        // Step 6: Execute CBDC settlement
        // Determine payer and payee based on meter type
        // NIT Jalandhar Treasury wallet
        const TREASURY_WALLET = 'NITJ-TREASURY';
        
        let payerWallet, payeeWallet;
        if (meterData.type === 'SOLAR' || meterData.carbonTag === 'GREEN') {
            // Solar produces energy - treasury pays the producer
            payerWallet = TREASURY_WALLET;
            payeeWallet = meterData.meterId;
        } else {
            // Consumption - consumer pays treasury
            payerWallet = meterData.meterId;
            payeeWallet = TREASURY_WALLET;
        }
        
        // Ensure wallet exists
        try {
            walletManager.getWallet(payeeWallet);
        } catch {
            // Create wallet if doesn't exist
            walletManager.createWallet(
                payeeWallet,
                meterData.type,
                `Auto-created for ${meterData.meterId}`,
                meterData.type === 'SOLAR' ? 0 : 10000000
            );
        }
        
        const settlement = walletManager.settlePayment(
            payerWallet,
            payeeWallet,
            pricing.finalAmount,
            {
                receiptId: blockchainReceipt.receiptId,
                tokenId: tokenResult.tokenId,
                kWh: meterData.kWh,
                carbonTag: meterData.carbonTag
            }
        );
        
        if (!settlement.success) {
            console.log('⚠️ Step 6: Settlement failed -', settlement.error);
            // Continue but mark as pending
        } else {
            console.log('✅ Step 6: CBDC settlement completed');
        }
        
        // Step 7: Record settlement reference on blockchain
        let settlementResult = null;
        if (settlement.success) {
            settlementResult = await blockchainService.recordSettlement(
                blockchainReceipt.receiptId,
                tokenResult.tokenId,
                settlement.paymentRef,
                pricing.finalAmount
            );
            console.log('✅ Step 7: Settlement recorded on blockchain');
        }
        
        // Step 8: Burn token after settlement
        if (settlement.success) {
            await blockchainService.burnToken(tokenResult.tokenId);
            console.log('✅ Step 8: Token burned after settlement');
        }
        
        // Store locally for dashboard
        const record = {
            receiptId: blockchainReceipt.receiptId,
            tokenId: tokenResult.tokenId,
            settlementId: settlementResult?.settlementId,
            meterId: meterData.meterId,
            type: meterData.type,
            kWh: meterData.kWh,
            carbonTag: meterData.carbonTag,
            timestamp: meterData.timestamp,
            pricing: pricing,
            settlement: settlement,
            blockchainTx: blockchainReceipt.transactionHash,
            createdAt: Date.now()
        };
        
        dataStore.receipts.push(record);
        dataStore.meterReadings.push(meterData);
        
        console.log('\n✅ COMPLETE FLOW EXECUTED SUCCESSFULLY');
        console.log('='.repeat(50) + '\n');
        
        res.json({
            success: true,
            receiptId: blockchainReceipt.receiptId,
            tokenId: tokenResult.tokenId,
            settlementId: settlementResult?.settlementId,
            pricing: pricing,
            settlement: settlement,
            blockchain: {
                receiptTx: blockchainReceipt.transactionHash,
                tokenTx: tokenResult.transactionHash,
                settlementTx: settlementResult?.transactionHash
            }
        });
        
    } catch (error) {
        console.error('❌ Error processing energy data:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/energy/receipts
 * Get all energy receipts
 */
app.get('/api/energy/receipts', (req, res) => {
    res.json({
        success: true,
        count: dataStore.receipts.length,
        receipts: dataStore.receipts
    });
});

/**
 * GET /api/energy/receipt/:id
 * Get specific receipt from blockchain
 */
app.get('/api/energy/receipt/:id', async (req, res) => {
    try {
        const receipt = await blockchainService.getReceipt(req.params.id);
        res.json({ success: true, receipt });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/energy/token/:id
 * Get specific token from blockchain
 */
app.get('/api/energy/token/:id', async (req, res) => {
    try {
        const token = await blockchainService.getToken(req.params.id);
        res.json({ success: true, token });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// ============ POLICY API ROUTES ============

/**
 * GET /api/policy/config
 * Get current policy configuration
 */
app.get('/api/policy/config', (req, res) => {
    res.json({
        success: true,
        config: policyEngine.getConfig()
    });
});

/**
 * POST /api/policy/calculate
 * Calculate price for given parameters
 */
app.post('/api/policy/calculate', (req, res) => {
    const { kWh, timestamp, carbonTag } = req.body;
    
    if (!kWh || !timestamp || !carbonTag) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: kWh, timestamp, carbonTag'
        });
    }
    
    const pricing = policyEngine.calculatePrice(kWh, timestamp, carbonTag);
    res.json({ success: true, pricing });
});

// ============ CBDC WALLET API ROUTES ============

/**
 * GET /api/wallet/all
 * Get all wallets
 */
app.get('/api/wallet/all', (req, res) => {
    res.json({
        success: true,
        wallets: walletManager.getAllWallets()
    });
});

/**
 * GET /api/wallet/:id
 * Get specific wallet
 */
app.get('/api/wallet/:id', (req, res) => {
    try {
        const wallet = walletManager.getWallet(req.params.id);
        res.json({ success: true, wallet });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/wallet/:id/transactions
 * Get wallet transactions
 */
app.get('/api/wallet/:id/transactions', (req, res) => {
    const transactions = walletManager.getTransactions(req.params.id);
    res.json({ success: true, transactions });
});

/**
 * GET /api/wallet/stats
 * Get CBDC system statistics
 */
app.get('/api/wallet/stats', (req, res) => {
    res.json({
        success: true,
        stats: walletManager.getStats()
    });
});

// ============ BLOCKCHAIN API ROUTES ============

/**
 * GET /api/blockchain/stats
 * Get blockchain statistics
 */
app.get('/api/blockchain/stats', async (req, res) => {
    try {
        const stats = await blockchainService.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ DASHBOARD API ROUTES ============

/**
 * GET /api/dashboard/summary
 * Get complete dashboard summary
 */
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        // Calculate energy totals
        let totalProduced = 0;
        let totalConsumed = 0;
        let greenEnergy = 0;
        let totalSettled = 0;
        
        for (const record of dataStore.receipts) {
            if (record.type === 'SOLAR') {
                totalProduced += record.kWh;
            } else {
                totalConsumed += record.kWh;
            }
            
            if (record.carbonTag === 'GREEN') {
                greenEnergy += record.kWh;
            }
            
            if (record.settlement?.success) {
                totalSettled += record.pricing.finalAmount;
            }
        }
        
        const totalEnergy = totalProduced + totalConsumed;
        const greenPercentage = totalEnergy > 0 
            ? ((greenEnergy / totalEnergy) * 100).toFixed(1) 
            : 0;
        
        // Get blockchain stats
        const blockchainStats = await blockchainService.getStats();
        
        // Get wallet stats
        const walletStats = walletManager.getStats();
        
        // Get recent transactions
        const recentReceipts = dataStore.receipts.slice(-10).reverse();
        
        res.json({
            success: true,
            summary: {
                energy: {
                    totalProduced: totalProduced.toFixed(3),
                    totalConsumed: totalConsumed.toFixed(3),
                    netEnergy: (totalProduced - totalConsumed).toFixed(3),
                    greenEnergy: greenEnergy.toFixed(3),
                    greenPercentage: `${greenPercentage}%`
                },
                blockchain: blockchainStats,
                cbdc: {
                    totalSettled,
                    totalSettledINR: `₹${(totalSettled / 100).toFixed(2)}`,
                    ...walletStats
                },
                transactions: {
                    total: dataStore.receipts.length,
                    recent: recentReceipts
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ============ SERVER STARTUP ============

async function startServer() {
    console.log('\n' + '='.repeat(60));
    console.log('       CAMPUS ENERGY TRADE - BACKEND SERVER');
    console.log('='.repeat(60) + '\n');
    
    try {
        // Initialize blockchain connection
        await blockchainService.initialize();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log('\n📡 API Endpoints:');
            console.log('   POST /api/energy/record     - Record energy data');
            console.log('   GET  /api/energy/receipts   - Get all receipts');
            console.log('   GET  /api/policy/config     - Get pricing policy');
            console.log('   GET  /api/wallet/all        - Get all wallets');
            console.log('   GET  /api/dashboard/summary - Get dashboard data');
            console.log('   GET  /api/blockchain/stats  - Get blockchain stats');
            console.log('\n' + '='.repeat(60) + '\n');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.log('\n⚠️  Make sure the Hardhat node is running:');
        console.log('   npx hardhat node');
        console.log('\n⚠️  And the contract is deployed:');
        console.log('   npm run deploy\n');
        process.exit(1);
    }
}

startServer();

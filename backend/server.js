/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * Express.js Backend Server
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const BlockchainService = require('./blockchain');
const PolicyEngine = require('./policyEngine');
const CBDCWallet = require('./cbdcWallet');
const { Logger, ErrorHandler, Validator } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_VERSION: 'v2',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000,  // 15 minutes
    RATE_LIMIT_MAX: 100,                 // requests per window
    CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:8080', 'https://sumansingh20.github.io']
};

// ═══════════════════════════════════════════════════════════════════════════════
// APPLICATION INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

class EnergyTradeServer {
    constructor() {
        this.app = express();
        this.logger = new Logger('Server');
        this.blockchain = null;
        this.policyEngine = new PolicyEngine();
        this.cbdcWallet = new CBDCWallet();
        this.isInitialized = false;
    }

    /**
     * Initialize all services and middleware
     */
    async initialize() {
        this.logger.info('🚀 Initializing Campus Energy Trade Server...');
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        
        try {
            this.blockchain = new BlockchainService();
            await this.blockchain.initialize();
            this.isInitialized = true;
            this.logger.success('✅ Server initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize blockchain:', error.message);
            this.isInitialized = false;
        }
        
        return this;
    }

    /**
     * Configure Express middleware
     */
    setupMiddleware() {
        // Security headers
        this.app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }));
        
        // CORS configuration
        this.app.use(cors({
            origin: CONFIG.CORS_ORIGINS,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        }));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: CONFIG.RATE_LIMIT_WINDOW,
            max: CONFIG.RATE_LIMIT_MAX,
            message: { error: 'Too many requests, please try again later.' }
        });
        this.app.use('/api/', limiter);
        
        // Request parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Compression
        this.app.use(compression());
        
        // Request logging
        if (CONFIG.NODE_ENV !== 'test') {
            this.app.use(morgan('combined', {
                stream: { write: (msg) => this.logger.http(msg.trim()) }
            }));
        }
        
        // Static files
        this.app.use(express.static(path.join(__dirname, '../frontend')));
        
        // Health check flag
        this.app.use((req, res, next) => {
            req.serverInitialized = this.isInitialized;
            req.services = {
                blockchain: this.blockchain,
                policyEngine: this.policyEngine,
                cbdcWallet: this.cbdcWallet
            };
            next();
        });
    }

    /**
     * Define API routes
     */
    setupRoutes() {
        const router = express.Router();

        // ─────────────────────────────────────────────────────────────────────
        // HEALTH & STATUS
        // ─────────────────────────────────────────────────────────────────────
        
        router.get('/health', (req, res) => {
            res.json({
                status: req.serverInitialized ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                version: CONFIG.API_VERSION,
                services: {
                    blockchain: req.serverInitialized,
                    policyEngine: true,
                    cbdcWallet: true
                }
            });
        });

        router.get('/status', async (req, res, next) => {
            try {
                const stats = req.serverInitialized 
                    ? await req.services.blockchain.getStatistics()
                    : { receipts: 0, tokens: 0, settlements: 0 };
                
                res.json({
                    success: true,
                    data: {
                        institution: 'Dr B R Ambedkar NIT Jalandhar',
                        blockchain: stats,
                        cbdcBalance: req.services.cbdcWallet.getTotalBalance(),
                        serverTime: new Date().toISOString()
                    }
                });
            } catch (error) {
                next(error);
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // ENERGY RECEIPTS
        // ─────────────────────────────────────────────────────────────────────
        
        router.post('/energy/record', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const { meterId, kWh, timestamp, carbonTag } = req.body;
                
                // Validation
                Validator.required({ meterId, kWh }, ['meterId', 'kWh']);
                Validator.number(kWh, 'kWh', 0.001, 10000);
                
                // Calculate pricing
                const ts = timestamp || Date.now();
                const pricing = req.services.policyEngine.calculatePrice(kWh, ts);
                
                // Record on blockchain
                const receipt = await req.services.blockchain.recordEnergyReceipt(
                    meterId,
                    Math.round(kWh * 1000),
                    ts,
                    carbonTag || 'NORMAL'
                );
                
                this.logger.info(`📊 Receipt #${receipt.receiptId} recorded for ${meterId}`);
                
                res.status(201).json({
                    success: true,
                    data: {
                        receipt,
                        pricing,
                        message: `Energy receipt recorded for ${kWh.toFixed(3)} kWh`
                    }
                });
            } catch (error) {
                next(error);
            }
        });

        router.get('/energy/receipt/:id', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const receiptId = parseInt(req.params.id);
                Validator.number(receiptId, 'receiptId', 1);
                
                const receipt = await req.services.blockchain.getReceipt(receiptId);
                
                res.json({ success: true, data: receipt });
            } catch (error) {
                next(error);
            }
        });

        router.get('/energy/meter/:meterId', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const receipts = await req.services.blockchain.getReceiptsForMeter(req.params.meterId);
                
                res.json({ success: true, data: { meterId: req.params.meterId, receipts } });
            } catch (error) {
                next(error);
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // TOKEN OPERATIONS
        // ─────────────────────────────────────────────────────────────────────
        
        router.post('/token/mint', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const { receiptId } = req.body;
                Validator.required({ receiptId }, ['receiptId']);
                Validator.number(receiptId, 'receiptId', 1);
                
                const token = await req.services.blockchain.mintToken(parseInt(receiptId));
                
                this.logger.info(`🪙 Token #${token.tokenId} minted for Receipt #${receiptId}`);
                
                res.status(201).json({
                    success: true,
                    data: {
                        token,
                        message: `Energy token minted successfully`
                    }
                });
            } catch (error) {
                next(error);
            }
        });

        router.get('/token/:id', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const tokenId = parseInt(req.params.id);
                Validator.number(tokenId, 'tokenId', 1);
                
                const token = await req.services.blockchain.getToken(tokenId);
                
                res.json({ success: true, data: token });
            } catch (error) {
                next(error);
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // CBDC SETTLEMENT
        // ─────────────────────────────────────────────────────────────────────
        
        router.post('/settlement/create', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const { receiptId, amount, payerWallet, payeeWallet } = req.body;
                Validator.required({ receiptId, amount }, ['receiptId', 'amount']);
                
                // Process CBDC transfer
                const transfer = await req.services.cbdcWallet.transfer(
                    payerWallet || 'NITJ_MAIN',
                    payeeWallet || 'PSPCL_GRID',
                    parseFloat(amount)
                );
                
                // Record settlement on blockchain
                const settlement = await req.services.blockchain.recordSettlement(
                    parseInt(receiptId),
                    transfer.referenceId,
                    Math.round(parseFloat(amount) * 100)
                );
                
                this.logger.info(`💰 Settlement #${settlement.settlementId}: ₹${amount} via CBDC`);
                
                res.status(201).json({
                    success: true,
                    data: {
                        settlement,
                        transfer,
                        message: `Settlement of ₹${amount} completed`
                    }
                });
            } catch (error) {
                next(error);
            }
        });

        router.get('/settlement/:id', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const settlementId = parseInt(req.params.id);
                const settlement = await req.services.blockchain.getSettlement(settlementId);
                
                res.json({ success: true, data: settlement });
            } catch (error) {
                next(error);
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // PRICING & POLICY
        // ─────────────────────────────────────────────────────────────────────
        
        router.post('/pricing/calculate', (req, res, next) => {
            try {
                const { kWh, timestamp } = req.body;
                Validator.required({ kWh }, ['kWh']);
                Validator.number(kWh, 'kWh', 0.001, 10000);
                
                const pricing = req.services.policyEngine.calculatePrice(
                    parseFloat(kWh),
                    timestamp || Date.now()
                );
                
                res.json({ success: true, data: pricing });
            } catch (error) {
                next(error);
            }
        });

        router.get('/pricing/tariff', (req, res) => {
            res.json({
                success: true,
                data: req.services.policyEngine.getTariffInfo()
            });
        });

        // ─────────────────────────────────────────────────────────────────────
        // CBDC WALLETS
        // ─────────────────────────────────────────────────────────────────────
        
        router.get('/wallet/balance/:walletId', (req, res, next) => {
            try {
                const balance = req.services.cbdcWallet.getBalance(req.params.walletId);
                res.json({ success: true, data: { walletId: req.params.walletId, balance } });
            } catch (error) {
                next(error);
            }
        });

        router.get('/wallet/all', (req, res) => {
            res.json({
                success: true,
                data: req.services.cbdcWallet.getAllBalances()
            });
        });

        router.get('/wallet/transactions/:walletId', (req, res, next) => {
            try {
                const transactions = req.services.cbdcWallet.getTransactions(req.params.walletId);
                res.json({ success: true, data: transactions });
            } catch (error) {
                next(error);
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // STATISTICS & REPORTS
        // ─────────────────────────────────────────────────────────────────────
        
        router.get('/statistics', async (req, res, next) => {
            try {
                const blockchainStats = req.serverInitialized 
                    ? await req.services.blockchain.getStatistics()
                    : { receipts: 0, tokens: 0, settlements: 0, totalEnergy: 0 };
                
                const cbdcStats = req.services.cbdcWallet.getStatistics();
                
                res.json({
                    success: true,
                    data: {
                        blockchain: blockchainStats,
                        cbdc: cbdcStats,
                        generated: new Date().toISOString()
                    }
                });
            } catch (error) {
                next(error);
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // FULL TRANSACTION FLOW
        // ─────────────────────────────────────────────────────────────────────
        
        router.post('/transaction/complete', async (req, res, next) => {
            try {
                this.validateBlockchainReady(req);
                
                const { meterId, kWh, carbonTag, payerWallet, payeeWallet } = req.body;
                Validator.required({ meterId, kWh }, ['meterId', 'kWh']);
                Validator.number(kWh, 'kWh', 0.001, 10000);
                
                const timestamp = Date.now();
                
                // Step 1: Calculate pricing
                const pricing = req.services.policyEngine.calculatePrice(parseFloat(kWh), timestamp);
                
                // Step 2: Record energy receipt
                const receipt = await req.services.blockchain.recordEnergyReceipt(
                    meterId,
                    Math.round(parseFloat(kWh) * 1000),
                    timestamp,
                    carbonTag || 'NORMAL'
                );
                
                // Step 3: Mint token
                const token = await req.services.blockchain.mintToken(receipt.receiptId);
                
                // Step 4: Process CBDC payment
                const transfer = await req.services.cbdcWallet.transfer(
                    payerWallet || 'NITJ_MAIN',
                    payeeWallet || 'PSPCL_GRID',
                    pricing.total
                );
                
                // Step 5: Record settlement
                const settlement = await req.services.blockchain.recordSettlement(
                    receipt.receiptId,
                    transfer.referenceId,
                    Math.round(pricing.total * 100)
                );
                
                this.logger.success(`✅ Complete transaction: ${meterId} | ${kWh} kWh | ₹${pricing.total.toFixed(2)}`);
                
                res.status(201).json({
                    success: true,
                    data: {
                        receipt,
                        token,
                        pricing,
                        transfer,
                        settlement,
                        summary: {
                            meterId,
                            kWh: parseFloat(kWh),
                            amount: pricing.total,
                            carbonTag: carbonTag || 'NORMAL'
                        }
                    }
                });
            } catch (error) {
                next(error);
            }
        });

        // Mount router
        this.app.use(`/api/${CONFIG.API_VERSION}`, router);
        
        // Legacy support
        this.app.use('/api', router);

        // Serve frontend
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.originalUrl
            });
        });
    }

    /**
     * Setup error handling middleware
     */
    setupErrorHandling() {
        this.app.use((error, req, res, next) => {
            const status = error.status || error.statusCode || 500;
            const message = error.message || 'Internal server error';
            
            this.logger.error(`[${status}] ${message}`);
            
            res.status(status).json({
                success: false,
                error: message,
                ...(CONFIG.NODE_ENV === 'development' && { stack: error.stack })
            });
        });
    }

    /**
     * Validate blockchain service is ready
     */
    validateBlockchainReady(req) {
        if (!req.serverInitialized) {
            const error = new Error('Blockchain service not ready. Please start Hardhat node first.');
            error.status = 503;
            throw error;
        }
    }

    /**
     * Start the server
     */
    async start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(CONFIG.PORT, () => {
                this.logger.success(`
╔═══════════════════════════════════════════════════════════════════╗
║     NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM                    ║
╠═══════════════════════════════════════════════════════════════════╣
║  Server:      http://localhost:${CONFIG.PORT}                            ║
║  API:         http://localhost:${CONFIG.PORT}/api/${CONFIG.API_VERSION}                       ║
║  Dashboard:   http://localhost:${CONFIG.PORT}/                           ║
║  Environment: ${CONFIG.NODE_ENV.padEnd(52)}║
║  Blockchain:  ${(this.isInitialized ? 'Connected ✓' : 'Disconnected ✗').padEnd(52)}║
╚═══════════════════════════════════════════════════════════════════╝
                `);
                resolve(this.server);
            });
        });
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger.info('Shutting down server...');
        
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.logger.info('Server closed');
                    resolve();
                });
            });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

const server = new EnergyTradeServer();

(async () => {
    try {
        await server.initialize();
        await server.start();
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
})();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
});

module.exports = server;

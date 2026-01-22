/**
 * Express Application Setup
 * NIT Jalandhar Campus Energy Trading Platform
 * 
 * @module app
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errors');
const { registerRoutes } = require('./api/routes');
const { rateLimiter } = require('./api/middleware');

const { MeterSimulator, FraudDetector } = require('./core');
const { PolicyEngine } = require('./services/policy');
const { CBDCSettlementOrchestrator } = require('./services/settlement');
const { ContractManager } = require('./services/blockchain');

/**
 * Create and configure Express application
 * @returns {object} App and services
 */
async function createApp() {
    const app = express();

    app.use(cors({
        origin: config.server.corsOrigin,
        credentials: true
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
        logger.http(`${req.method} ${req.path}`);
        next();
    });

    app.use('/api', rateLimiter);

    const meterSimulator = new MeterSimulator();
    const fraudDetector = new FraudDetector();
    const policyEngine = new PolicyEngine();
    const settlementOrchestrator = new CBDCSettlementOrchestrator();
    const contractManager = new ContractManager();

    logger.info('Initializing services...');

    await contractManager.initialize();
    
    settlementOrchestrator.initializeEcosystem();

    for (const meterId of config.meters.default) {
        const type = meterId.includes('SOLAR') ? 'SOLAR' : 'GRID';
        meterSimulator.registerMeter(meterId, type, `NIT Jalandhar - ${meterId}`);
    }

    const services = {
        meterSimulator,
        fraudDetector,
        policyEngine,
        settlementOrchestrator,
        contractManager
    };

    registerRoutes(app, services);

    const publicPath = path.join(__dirname, '..', 'public');
    app.use(express.static(publicPath));

    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(publicPath, 'dashboard.html'));
    });

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: `Route ${req.method} ${req.path} not found`
            }
        });
    });

    app.use(errorHandler);

    return { app, services };
}

module.exports = { createApp };

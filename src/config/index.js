/**
 * Application Configuration Module
 * Centralized configuration management for Campus Energy Trade System
 * 
 * @module config
 * @author NIT Jalandhar Energy Research Team
 * @version 2.0.0
 */

'use strict';

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment detection
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_TEST = NODE_ENV === 'test';

/**
 * Server configuration
 */
const server = {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: IS_PRODUCTION ? 100 : 1000
    }
};

/**
 * Blockchain configuration
 */
const blockchain = {
    network: {
        name: process.env.NETWORK_NAME || 'localhost',
        chainId: parseInt(process.env.CHAIN_ID, 10) || 31337,
        rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545'
    },
    contract: {
        address: process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        deployer: process.env.DEPLOYER_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    },
    wallet: {
        privateKey: process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    gas: {
        limit: parseInt(process.env.GAS_LIMIT, 10) || 3000000,
        price: process.env.GAS_PRICE || 'auto'
    }
};

/**
 * Energy trading parameters (PSPCL Punjab tariff rates)
 */
const energy = {
    tariff: {
        baseRate: parseFloat(process.env.BASE_RATE) || 6.79,
        currency: 'INR',
        unit: 'kWh'
    },
    timeOfUse: {
        peak: {
            hours: [18, 19, 20, 21, 22],
            multiplier: 1.20
        },
        standard: {
            hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 22, 23],
            multiplier: 1.00
        },
        offPeak: {
            hours: [0, 1, 2, 3, 4, 5],
            multiplier: 0.85
        }
    },
    carbon: {
        gridIntensity: 0.82,
        solarIntensity: 0.02,
        hybridIntensity: 0.35,
        pricePerKg: 0.50
    },
    limits: {
        maxTradeKwh: 1000,
        minTradeKwh: 0.1,
        priceFloor: 4.00,
        priceCap: 15.00
    }
};

/**
 * CBDC Settlement configuration (RBI e₹ pilot specs)
 */
const cbdc = {
    retail: {
        enabled: true,
        dailyLimit: 100000,
        transactionLimit: 50000,
        escrowTimeout: 86400000
    },
    wholesale: {
        enabled: true,
        nettingCycles: 4,
        settlementWindow: 21600000,
        minimumThreshold: 10000
    },
    conditions: ['ENERGY_ONLY', 'TIME_BOUND', 'CARBON_LINKED']
};

/**
 * Security configuration
 */
const security = {
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },
    fraud: {
        replayWindowMs: 60000,
        clockSkewToleranceMs: 5000,
        maxValueKwh: 500,
        minValueKwh: 0.01
    },
    signing: {
        algorithm: 'Ed25519',
        keySize: 256
    },
    encryption: {
        algorithm: 'AES-256-GCM'
    }
};

/**
 * Logging configuration
 */
const logging = {
    level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
    format: IS_PRODUCTION ? 'json' : 'pretty',
    timestamp: true,
    colorize: !IS_PRODUCTION
};

/**
 * Paths configuration
 */
const paths = {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '..'),
    contracts: path.resolve(__dirname, '../../contracts'),
    artifacts: path.resolve(__dirname, '../../artifacts'),
    public: path.resolve(__dirname, '../../public'),
    logs: path.resolve(__dirname, '../../logs')
};

/**
 * Campus meter configuration
 */
const meters = {
    types: {
        SOLAR: { prefix: 'SOL', carbonTag: 'SOLAR', baseLoad: 5, variance: 15 },
        GRID: { prefix: 'GRD', carbonTag: 'GRID', baseLoad: 20, variance: 30 },
        EV_CHARGER: { prefix: 'EVC', carbonTag: 'HYBRID', baseLoad: 7, variance: 50 },
        BATTERY: { prefix: 'BAT', carbonTag: 'SOLAR', baseLoad: 3, variance: 10 }
    },
    locations: [
        'Main Building Rooftop',
        'Mega Hostel Block-1',
        'Research Lab Complex',
        'EV Charging Station',
        'Library',
        'Admin Building',
        'Sports Complex',
        'Cafeteria'
    ],
    default: [
        'NITJ-SOL-MAIN-001',
        'NITJ-SOL-HOSTEL-002',
        'NITJ-GRD-ADMIN-001',
        'NITJ-EVC-PARKING-001',
        'NITJ-BAT-LIBRARY-001'
    ]
};

module.exports = {
    env: NODE_ENV,
    isProduction: IS_PRODUCTION,
    isDevelopment: IS_DEVELOPMENT,
    isTest: IS_TEST,
    server,
    blockchain,
    energy,
    cbdc,
    security,
    logging,
    paths,
    meters
};

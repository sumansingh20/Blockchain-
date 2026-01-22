/**
 * Server Entry Point
 * NIT Jalandhar Campus Energy Trading Platform
 * 
 * @module server
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const config = require('./config');
const logger = require('./utils/logger');
const { createApp } = require('./app');

/**
 * Start the server
 */
async function startServer() {
    logger.section('NIT Jalandhar Campus Energy Trading Platform');
    logger.info('Starting server...');

    try {
        const { app, services } = await createApp();

        const server = app.listen(config.server.port, () => {
            logger.success(`Server running on port ${config.server.port}`);
            logger.info(`Environment: ${config.server.env}`);
            logger.info(`Dashboard: http://localhost:${config.server.port}/dashboard`);
            logger.info(`API Base: http://localhost:${config.server.port}/api`);

            const blockchainMetrics = services.contractManager.getMetrics();
            if (blockchainMetrics.connection.simulationMode) {
                logger.warn('Blockchain: Simulation mode (Hardhat not running)');
            } else {
                logger.success(`Blockchain: Connected to ${config.blockchain.rpcUrl}`);
            }
        });

        process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception', { error: error.message, stack: error.stack });
            gracefulShutdown(server, 'uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection', { reason: String(reason) });
        });

        return server;

    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

/**
 * Graceful shutdown handler
 * @param {Server} server - HTTP server
 * @param {string} signal - Signal received
 */
function gracefulShutdown(server, signal) {
    logger.warn(`${signal} received, shutting down gracefully...`);

    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    setTimeout(() => {
        logger.error('Forced shutdown');
        process.exit(1);
    }, 10000);
}

if (require.main === module) {
    startServer();
}

module.exports = { startServer };

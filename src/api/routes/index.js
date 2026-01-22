/**
 * API Routes Index
 * Route registration and exports
 * 
 * @module api/routes
 */

'use strict';

const createTradesRouter = require('./trades');
const createWalletsRouter = require('./wallets');
const createMetersRouter = require('./meters');
const createStatisticsRouter = require('./statistics');
const createHealthRouter = require('./health');

/**
 * Register all API routes
 * @param {Express} app - Express application
 * @param {object} services - Service instances
 */
function registerRoutes(app, services) {
    app.use('/api/trades', createTradesRouter(services));
    app.use('/api/wallets', createWalletsRouter(services));
    app.use('/api/meters', createMetersRouter(services));
    app.use('/api/statistics', createStatisticsRouter(services));
    app.use('/api/health', createHealthRouter(services));
}

module.exports = {
    registerRoutes,
    createTradesRouter,
    createWalletsRouter,
    createMetersRouter,
    createStatisticsRouter,
    createHealthRouter
};

/**
 * Statistics API Routes
 * System metrics and analytics
 * 
 * @module api/routes/statistics
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../../utils/errors');
const { successResponse } = require('../utils/response');

const router = express.Router();

/**
 * Create statistics router
 * @param {object} services - Service instances
 * @returns {Router} Express router
 */
function createStatisticsRouter(services) {
    const { 
        policyEngine, 
        contractManager, 
        settlementOrchestrator,
        meterSimulator,
        fraudDetector 
    } = services;

    /**
     * GET /api/statistics
     * Get comprehensive system statistics
     */
    router.get('/',
        asyncHandler(async (req, res) => {
            const policyMetrics = policyEngine.getMetrics();
            const blockchainMetrics = contractManager.getMetrics();
            const settlementMetrics = settlementOrchestrator.getMetrics();
            const fraudStats = fraudDetector.getStats();
            const meterStats = meterSimulator.getStats();

            successResponse(res, {
                policy: policyMetrics,
                blockchain: blockchainMetrics,
                settlement: settlementMetrics,
                security: {
                    fraud: fraudStats
                },
                meters: meterStats,
                timestamp: new Date().toISOString()
            });
        })
    );

    /**
     * GET /api/statistics/kpis
     * Get key performance indicators
     */
    router.get('/kpis',
        asyncHandler(async (req, res) => {
            const kpis = policyEngine.getKPIs();
            successResponse(res, kpis);
        })
    );

    /**
     * GET /api/statistics/tariff
     * Get current tariff information
     */
    router.get('/tariff',
        asyncHandler(async (req, res) => {
            const tariff = policyEngine.getCurrentTariff();
            successResponse(res, tariff);
        })
    );

    /**
     * GET /api/statistics/carbon
     * Get carbon summary
     */
    router.get('/carbon',
        asyncHandler(async (req, res) => {
            const carbon = policyEngine.getCarbonSummary();
            successResponse(res, carbon);
        })
    );

    /**
     * GET /api/statistics/blockchain
     * Get blockchain metrics
     */
    router.get('/blockchain',
        asyncHandler(async (req, res) => {
            const metrics = contractManager.getMetrics();
            successResponse(res, metrics);
        })
    );

    /**
     * GET /api/statistics/settlement
     * Get settlement metrics
     */
    router.get('/settlement',
        asyncHandler(async (req, res) => {
            const metrics = settlementOrchestrator.getMetrics();
            successResponse(res, metrics);
        })
    );

    /**
     * GET /api/statistics/fraud
     * Get fraud detection statistics
     */
    router.get('/fraud',
        asyncHandler(async (req, res) => {
            const stats = fraudDetector.getStats();
            const alerts = fraudDetector.getAlerts();
            
            successResponse(res, {
                statistics: stats,
                recentAlerts: alerts.slice(-10)
            });
        })
    );

    return router;
}

module.exports = createStatisticsRouter;

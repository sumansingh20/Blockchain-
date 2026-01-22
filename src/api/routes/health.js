/**
 * Health Check API Routes
 * System health and status
 * 
 * @module api/routes/health
 */

'use strict';

const express = require('express');
const config = require('../../config');
const { asyncHandler } = require('../../utils/errors');
const { successResponse } = require('../utils/response');

const router = express.Router();
const startTime = Date.now();

/**
 * Create health router
 * @param {object} services - Service instances
 * @returns {Router} Express router
 */
function createHealthRouter(services) {
    const { contractManager } = services;

    /**
     * GET /api/health
     * Basic health check
     */
    router.get('/',
        asyncHandler(async (req, res) => {
            successResponse(res, {
                status: 'healthy',
                uptime: Math.floor((Date.now() - startTime) / 1000),
                timestamp: new Date().toISOString()
            });
        })
    );

    /**
     * GET /api/health/ready
     * Readiness check
     */
    router.get('/ready',
        asyncHandler(async (req, res) => {
            const blockchainMetrics = contractManager.getMetrics();

            successResponse(res, {
                status: 'ready',
                services: {
                    blockchain: blockchainMetrics.connection.connected || blockchainMetrics.connection.simulationMode,
                    policyEngine: true,
                    settlement: true
                },
                timestamp: new Date().toISOString()
            });
        })
    );

    /**
     * GET /api/health/live
     * Liveness check
     */
    router.get('/live',
        asyncHandler(async (req, res) => {
            successResponse(res, {
                status: 'alive',
                timestamp: new Date().toISOString()
            });
        })
    );

    /**
     * GET /api/health/info
     * System information
     */
    router.get('/info',
        asyncHandler(async (req, res) => {
            successResponse(res, {
                name: 'NIT Jalandhar Campus Energy Trading Platform',
                version: '2.0.0',
                environment: config.server.env,
                node: process.version,
                uptime: Math.floor((Date.now() - startTime) / 1000),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
                standards: {
                    metering: 'IS-15959:2011',
                    cryptography: 'Ed25519 (RFC 8032)',
                    cbdc: 'RBI e₹ Pilot'
                }
            });
        })
    );

    return router;
}

module.exports = createHealthRouter;

/**
 * Meters API Routes
 * Smart meter simulation and readings
 * 
 * @module api/routes/meters
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../../utils/errors');
const { successResponse, errorResponse } = require('../utils/response');
const { validateBody, validateParams } = require('../middleware');

const router = express.Router();

/**
 * Create meters router
 * @param {object} services - Service instances
 * @returns {Router} Express router
 */
function createMetersRouter(services) {
    const { meterSimulator, fraudDetector } = services;

    /**
     * GET /api/meters
     * Get all meters
     */
    router.get('/',
        asyncHandler(async (req, res) => {
            const meters = meterSimulator.getAllMeters();
            successResponse(res, { meters, count: meters.length });
        })
    );

    /**
     * POST /api/meters
     * Register a new meter
     */
    router.post('/',
        validateBody({
            meterId: { required: true, type: 'string' },
            location: { required: false, type: 'string' },
            type: { required: false, type: 'string', enum: ['SOLAR', 'GRID', 'EV_CHARGER', 'BATTERY'] }
        }),
        asyncHandler(async (req, res) => {
            const { meterId, location, type } = req.body;

            const meterType = type || 'GRID';
            const meter = meterSimulator.registerMeter(meterId, meterType, location || 'Unknown');

            successResponse(res, meter, 201);
        })
    );

    /**
     * GET /api/meters/:meterId
     * Get meter by ID
     */
    router.get('/:meterId',
        asyncHandler(async (req, res) => {
            const meter = meterSimulator.getMeter(req.params.meterId);

            if (!meter) {
                return errorResponse(res, 'Meter not found', 404, 'NOT_FOUND');
            }

            successResponse(res, meter);
        })
    );

    /**
     * POST /api/meters/:meterId/reading
     * Generate a reading for a meter
     */
    router.post('/:meterId/reading',
        asyncHandler(async (req, res) => {
            const reading = meterSimulator.generateReading(req.params.meterId);

            if (!reading) {
                return errorResponse(res, 'Meter not found', 404, 'NOT_FOUND');
            }

            const fraudCheck = fraudDetector.analyze(reading);

            successResponse(res, {
                reading,
                security: {
                    fraudScore: fraudCheck.score,
                    alerts: fraudCheck.alerts,
                    passed: fraudCheck.alerts.length === 0
                }
            }, 201);
        })
    );

    /**
     * POST /api/meters/:meterId/verify
     * Verify a meter reading
     */
    router.post('/:meterId/verify',
        validateBody({
            signature: { required: true, type: 'string' },
            dataHash: { required: true, type: 'string' }
        }),
        asyncHandler(async (req, res) => {
            const { signature, dataHash } = req.body;

            const isValid = meterSimulator.verifyReading(
                req.params.meterId,
                signature,
                dataHash
            );

            successResponse(res, { 
                valid: isValid,
                meterId: req.params.meterId,
                verifiedAt: new Date().toISOString()
            });
        })
    );

    /**
     * GET /api/meters/:meterId/history
     * Get meter reading history
     */
    router.get('/:meterId/history',
        asyncHandler(async (req, res) => {
            const limit = parseInt(req.query.limit, 10) || 50;
            const history = meterSimulator.getHistory(req.params.meterId, limit);

            if (!history) {
                return errorResponse(res, 'Meter not found', 404, 'NOT_FOUND');
            }

            successResponse(res, {
                meterId: req.params.meterId,
                readings: history,
                count: history.length
            });
        })
    );

    return router;
}

module.exports = createMetersRouter;

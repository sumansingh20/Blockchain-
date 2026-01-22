/**
 * Trades API Routes
 * Energy trade submission and retrieval
 * 
 * @module api/routes/trades
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../../utils/errors');
const { successResponse, errorResponse } = require('../utils/response');
const { validateBody, validateQuery } = require('../middleware');

const router = express.Router();

/**
 * Trade submission schema
 */
const tradeSchema = {
    producer: { required: true, type: 'string' },
    consumer: { required: true, type: 'string' },
    energyKWh: { required: true, type: 'number', min: 0.001, max: 1000 },
    source: { required: false, type: 'string', enum: ['SOLAR', 'WIND', 'GRID'] }
};

/**
 * Create trades router
 * @param {object} services - Service instances
 * @returns {Router} Express router
 */
function createTradesRouter(services) {
    const { policyEngine, contractManager, settlementOrchestrator } = services;

    /**
     * POST /api/trades
     * Submit a new energy trade
     */
    router.post('/',
        validateBody(tradeSchema),
        asyncHandler(async (req, res) => {
            const { producer, consumer, energyKWh, source } = req.body;

            const trade = {
                producer,
                consumer,
                kWh: energyKWh,
                sourceType: source || 'SOLAR',
                timestamp: Date.now()
            };

            const policyResult = policyEngine.processTrade(trade);

            const blockchainResult = await contractManager.recordTrade({
                ...trade,
                pricePerKWh: policyResult.tariff.ratePerKWh,
                carbonTag: policyResult.carbon.certificate?.source || 'SOLAR'
            });

            const settlementResult = await settlementOrchestrator.executeSettlement(
                trade,
                policyResult
            );

            successResponse(res, {
                trade: {
                    id: blockchainResult.tradeId,
                    producer,
                    consumer,
                    energyKWh,
                    source: source || 'SOLAR'
                },
                policy: policyResult,
                blockchain: {
                    transactionHash: blockchainResult.transactionHash,
                    blockNumber: blockchainResult.blockNumber,
                    gasUsed: blockchainResult.gasUsed,
                    simulated: blockchainResult.simulated
                },
                settlement: settlementResult.settlement
            }, 201);
        })
    );

    /**
     * POST /api/trades/batch
     * Submit multiple trades
     */
    router.post('/batch',
        asyncHandler(async (req, res) => {
            const trades = req.body.trades;

            if (!Array.isArray(trades) || trades.length === 0) {
                return errorResponse(res, 'trades array is required', 400, 'VALIDATION_ERROR');
            }

            if (trades.length > 100) {
                return errorResponse(res, 'Maximum 100 trades per batch', 400, 'VALIDATION_ERROR');
            }

            const results = [];

            for (const tradeInput of trades) {
                try {
                    const trade = {
                        producer: tradeInput.producer,
                        consumer: tradeInput.consumer,
                        kWh: tradeInput.energyKWh || tradeInput.kWh,
                        sourceType: tradeInput.source || tradeInput.sourceType || 'SOLAR',
                        timestamp: Date.now()
                    };

                    const policyResult = policyEngine.processTrade(trade);
                    const blockchainResult = await contractManager.recordTrade({
                        ...trade,
                        pricePerKWh: policyResult.tariff.ratePerKWh,
                        carbonTag: policyResult.carbon.certificate?.source || 'SOLAR'
                    });

                    results.push({
                        success: true,
                        tradeId: blockchainResult.tradeId,
                        transactionHash: blockchainResult.transactionHash
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        error: error.message
                    });
                }
            }

            successResponse(res, {
                processed: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results
            });
        })
    );

    /**
     * GET /api/trades
     * Get recent trades
     */
    router.get('/',
        validateQuery({
            limit: { required: false, type: 'integer' }
        }),
        asyncHandler(async (req, res) => {
            const limit = req.query.limit || 10;
            const trades = contractManager.getRecentTrades(limit);

            successResponse(res, {
                trades,
                count: trades.length
            });
        })
    );

    /**
     * GET /api/trades/:tradeId
     * Get trade by ID
     */
    router.get('/:tradeId',
        asyncHandler(async (req, res) => {
            const trade = await contractManager.getTrade(req.params.tradeId);

            if (!trade) {
                return errorResponse(res, 'Trade not found', 404, 'NOT_FOUND');
            }

            successResponse(res, trade);
        })
    );

    return router;
}

module.exports = createTradesRouter;

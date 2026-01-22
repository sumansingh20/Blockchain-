/**
 * Wallets API Routes
 * CBDC wallet management
 * 
 * @module api/routes/wallets
 */

'use strict';

const express = require('express');
const { asyncHandler } = require('../../utils/errors');
const { successResponse, errorResponse } = require('../utils/response');
const { validateBody } = require('../middleware');

const router = express.Router();

/**
 * Create wallets router
 * @param {object} services - Service instances
 * @returns {Router} Express router
 */
function createWalletsRouter(services) {
    const { settlementOrchestrator } = services;

    /**
     * GET /api/wallets
     * Get all wallets
     */
    router.get('/',
        asyncHandler(async (req, res) => {
            const type = req.query.type;

            let wallets;
            if (type === 'wholesale') {
                wallets = settlementOrchestrator.getWholesaleInstitutions();
            } else if (type === 'retail') {
                wallets = settlementOrchestrator.getRetailWallets();
            } else {
                wallets = {
                    retail: settlementOrchestrator.getRetailWallets(),
                    wholesale: settlementOrchestrator.getWholesaleInstitutions()
                };
            }

            successResponse(res, wallets);
        })
    );

    /**
     * GET /api/wallets/:walletId
     * Get wallet by ID
     */
    router.get('/:walletId',
        asyncHandler(async (req, res) => {
            const retail = settlementOrchestrator.retailManager.getWallet(req.params.walletId);
            const wholesale = settlementOrchestrator.wholesaleModule.getInstitution(req.params.walletId);

            const wallet = retail || wholesale;

            if (!wallet) {
                return errorResponse(res, 'Wallet not found', 404, 'NOT_FOUND');
            }

            successResponse(res, wallet);
        })
    );

    /**
     * POST /api/wallets/transfer
     * Transfer between retail wallets
     */
    router.post('/transfer',
        validateBody({
            from: { required: true, type: 'string' },
            to: { required: true, type: 'string' },
            amount: { required: true, type: 'number', min: 0.01 }
        }),
        asyncHandler(async (req, res) => {
            const { from, to, amount, reference } = req.body;

            const result = settlementOrchestrator.retailManager.transfer(
                from,
                to,
                amount,
                { reference }
            );

            successResponse(res, result, 201);
        })
    );

    /**
     * POST /api/wallets/escrow
     * Create escrow
     */
    router.post('/escrow',
        validateBody({
            walletId: { required: true, type: 'string' },
            amount: { required: true, type: 'number', min: 0.01 }
        }),
        asyncHandler(async (req, res) => {
            const { walletId, amount, conditions } = req.body;

            const escrow = settlementOrchestrator.retailManager.createEscrow(
                walletId,
                amount,
                conditions || {}
            );

            successResponse(res, escrow, 201);
        })
    );

    /**
     * POST /api/wallets/netting
     * Execute wholesale netting
     */
    router.post('/netting',
        asyncHandler(async (req, res) => {
            const result = settlementOrchestrator.executeWholesaleNetting();
            successResponse(res, result);
        })
    );

    return router;
}

module.exports = createWalletsRouter;

/**
 * CBDC Settlement Service
 * Implements RBI e₹ pilot-compliant digital rupee settlement
 * 
 * @module services/settlement/CBDCSettlement
 * @author NIT Jalandhar Energy Research Team
 * @see https://rbi.org.in/Scripts/PublicationReportDetails.aspx?UrlPage=&ID=1218
 */

'use strict';

const config = require('../../config');
const { generateId, percentile } = require('../../utils/helpers');
const { SettlementError, ValidationError } = require('../../utils/errors');
const logger = require('../../utils/logger').child('CBDC');

/**
 * Settlement rails
 */
const RAILS = Object.freeze({
    RETAIL: 'e₹-R',
    WHOLESALE: 'e₹-W'
});

/**
 * Programmable conditions
 */
const CONDITIONS = Object.freeze({
    ENERGY_ONLY: 'ENERGY_ONLY',
    TIME_BOUND: 'TIME_BOUND',
    CARBON_LINKED: 'CARBON_LINKED'
});

/**
 * Wallet statuses
 */
const WALLET_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    FROZEN: 'FROZEN',
    CLOSED: 'CLOSED'
});

/**
 * Retail Wallet Manager
 * Manages e₹-R wallets for consumers and prosumers
 */
class RetailWalletManager {
    constructor() {
        this.wallets = new Map();
        this.transactions = [];
        this.escrows = new Map();
        
        this.config = {
            dailyLimit: config.cbdc.retail.dailyLimit,
            transactionLimit: config.cbdc.retail.transactionLimit,
            escrowTimeout: config.cbdc.retail.escrowTimeout
        };
    }

    /**
     * Create a new retail wallet
     * @param {string} walletId - Unique wallet ID
     * @param {object} metadata - Wallet metadata
     * @returns {object} Created wallet
     */
    createWallet(walletId, metadata = {}) {
        if (this.wallets.has(walletId)) {
            throw new ValidationError(`Wallet ${walletId} already exists`, ['walletId']);
        }

        const wallet = {
            walletId,
            type: 'RETAIL',
            rail: RAILS.RETAIL,
            balance: metadata.initialBalance || 0,
            status: WALLET_STATUS.ACTIVE,
            kycVerified: metadata.kycVerified || false,
            metadata: {
                name: metadata.name || walletId,
                entityType: metadata.entityType || 'INDIVIDUAL',
                createdAt: new Date().toISOString()
            },
            limits: {
                daily: this.config.dailyLimit,
                perTransaction: this.config.transactionLimit,
                usedToday: 0,
                lastReset: new Date().toDateString()
            },
            stats: {
                totalTransactions: 0,
                totalDebit: 0,
                totalCredit: 0
            }
        };

        this.wallets.set(walletId, wallet);
        logger.debug('Wallet created', { walletId, balance: wallet.balance });

        return this._sanitizeWallet(wallet);
    }

    /**
     * Execute a transfer between wallets
     * @param {string} fromId - Source wallet
     * @param {string} toId - Destination wallet
     * @param {number} amount - Amount to transfer
     * @param {object} options - Transfer options
     * @returns {object} Transaction result
     */
    transfer(fromId, toId, amount, options = {}) {
        const from = this.wallets.get(fromId);
        const to = this.wallets.get(toId);

        if (!from) throw new SettlementError(`Source wallet not found: ${fromId}`);
        if (!to) throw new SettlementError(`Destination wallet not found: ${toId}`);
        if (from.status !== WALLET_STATUS.ACTIVE) throw new SettlementError('Source wallet not active');
        if (to.status !== WALLET_STATUS.ACTIVE) throw new SettlementError('Destination wallet not active');
        if (from.balance < amount) throw new SettlementError('Insufficient balance');

        this._resetDailyLimit(from);
        if (from.limits.usedToday + amount > from.limits.daily) {
            throw new SettlementError('Daily limit exceeded');
        }
        if (amount > from.limits.perTransaction) {
            throw new SettlementError('Transaction limit exceeded');
        }

        from.balance -= amount;
        to.balance += amount;
        from.limits.usedToday += amount;

        from.stats.totalTransactions++;
        from.stats.totalDebit += amount;
        to.stats.totalTransactions++;
        to.stats.totalCredit += amount;

        const transaction = {
            transactionId: generateId('TXN'),
            type: 'TRANSFER',
            from: fromId,
            to: toId,
            amount,
            rail: RAILS.RETAIL,
            reference: options.reference,
            conditions: options.conditions || [],
            timestamp: new Date().toISOString(),
            status: 'COMPLETED'
        };

        this.transactions.push(transaction);
        return transaction;
    }

    /**
     * Create an escrow hold
     * @param {string} walletId - Wallet ID
     * @param {number} amount - Amount to escrow
     * @param {object} conditions - Release conditions
     * @returns {object} Escrow details
     */
    createEscrow(walletId, amount, conditions = {}) {
        const wallet = this.wallets.get(walletId);
        if (!wallet) throw new SettlementError(`Wallet not found: ${walletId}`);
        if (wallet.balance < amount) throw new SettlementError('Insufficient balance for escrow');

        wallet.balance -= amount;

        const escrow = {
            escrowId: generateId('ESC'),
            walletId,
            amount,
            conditions: {
                type: conditions.type || CONDITIONS.ENERGY_ONLY,
                expiresAt: conditions.expiresAt || new Date(Date.now() + this.config.escrowTimeout).toISOString(),
                beneficiary: conditions.beneficiary,
                purpose: conditions.purpose || 'Energy settlement'
            },
            status: 'HELD',
            createdAt: new Date().toISOString()
        };

        this.escrows.set(escrow.escrowId, escrow);
        return escrow;
    }

    /**
     * Release escrow to beneficiary
     * @param {string} escrowId - Escrow ID
     * @returns {object} Release transaction
     */
    releaseEscrow(escrowId) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) throw new SettlementError(`Escrow not found: ${escrowId}`);
        if (escrow.status !== 'HELD') throw new SettlementError('Escrow not in HELD status');

        const beneficiary = this.wallets.get(escrow.conditions.beneficiary);
        if (beneficiary) {
            beneficiary.balance += escrow.amount;
            beneficiary.stats.totalCredit += escrow.amount;
        }

        escrow.status = 'RELEASED';
        escrow.releasedAt = new Date().toISOString();

        const transaction = {
            transactionId: generateId('TXN'),
            type: 'ESCROW_RELEASE',
            escrowId,
            from: escrow.walletId,
            to: escrow.conditions.beneficiary,
            amount: escrow.amount,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED'
        };

        this.transactions.push(transaction);
        return transaction;
    }

    /**
     * Refund expired escrow
     * @param {string} escrowId - Escrow ID
     * @returns {object} Refund transaction
     */
    refundEscrow(escrowId) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) throw new SettlementError(`Escrow not found: ${escrowId}`);
        if (escrow.status !== 'HELD') throw new SettlementError('Escrow not in HELD status');

        const wallet = this.wallets.get(escrow.walletId);
        if (wallet) {
            wallet.balance += escrow.amount;
        }

        escrow.status = 'REFUNDED';
        escrow.refundedAt = new Date().toISOString();

        return { escrowId, status: 'REFUNDED', amount: escrow.amount };
    }

    /**
     * Get wallet by ID
     * @param {string} walletId - Wallet ID
     * @returns {object|null} Wallet
     */
    getWallet(walletId) {
        const wallet = this.wallets.get(walletId);
        return wallet ? this._sanitizeWallet(wallet) : null;
    }

    /**
     * Get all wallets
     * @returns {object[]} Array of wallets
     */
    getAllWallets() {
        return Array.from(this.wallets.values()).map(w => this._sanitizeWallet(w));
    }

    /**
     * Reset daily limits if needed
     * @private
     */
    _resetDailyLimit(wallet) {
        const today = new Date().toDateString();
        if (wallet.limits.lastReset !== today) {
            wallet.limits.usedToday = 0;
            wallet.limits.lastReset = today;
        }
    }

    /**
     * Sanitize wallet for external use
     * @private
     */
    _sanitizeWallet(wallet) {
        return {
            walletId: wallet.walletId,
            type: wallet.type,
            rail: wallet.rail,
            balance: wallet.balance,
            status: wallet.status,
            metadata: wallet.metadata
        };
    }
}

/**
 * Wholesale Netting Module
 * Handles multilateral netting for institutional settlements
 */
class WholesaleNettingModule {
    constructor() {
        this.institutions = new Map();
        this.obligations = [];
        this.nettingCycles = [];

        this.config = {
            cyclesPerDay: config.cbdc.wholesale.nettingCycles,
            minimumThreshold: config.cbdc.wholesale.minimumThreshold
        };
    }

    /**
     * Register an institution
     * @param {string} institutionId - Institution ID
     * @param {object} details - Institution details
     * @returns {object} Registered institution
     */
    registerInstitution(institutionId, details = {}) {
        const institution = {
            institutionId,
            name: details.name || institutionId,
            type: details.type || 'UTILITY',
            balance: details.initialBalance || 0,
            rail: RAILS.WHOLESALE,
            obligations: { payable: 0, receivable: 0 },
            registeredAt: new Date().toISOString()
        };

        this.institutions.set(institutionId, institution);
        return institution;
    }

    /**
     * Add an obligation
     * @param {string} fromId - Debtor institution
     * @param {string} toId - Creditor institution
     * @param {number} amount - Amount
     * @param {string} reference - Reference
     */
    addObligation(fromId, toId, amount, reference = null) {
        const from = this.institutions.get(fromId);
        const to = this.institutions.get(toId);

        if (from) from.obligations.payable += amount;
        if (to) to.obligations.receivable += amount;

        this.obligations.push({
            obligationId: generateId('OBL'),
            from: fromId,
            to: toId,
            amount,
            reference,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Execute netting cycle
     * @returns {object} Netting result
     */
    executeNetting() {
        const cycleId = generateId('NET');
        const pendingObligations = this.obligations.filter(o => o.status === 'PENDING');

        if (pendingObligations.length === 0) {
            return { cycleId, settled: 0, grossVolume: 0, netVolume: 0, nettingEfficiency: 0 };
        }

        const netPositions = new Map();

        for (const obl of pendingObligations) {
            if (!netPositions.has(obl.from)) netPositions.set(obl.from, 0);
            if (!netPositions.has(obl.to)) netPositions.set(obl.to, 0);

            netPositions.set(obl.from, netPositions.get(obl.from) - obl.amount);
            netPositions.set(obl.to, netPositions.get(obl.to) + obl.amount);
        }

        const grossVolume = pendingObligations.reduce((sum, o) => sum + o.amount, 0);
        let netVolume = 0;

        for (const [instId, position] of netPositions) {
            const institution = this.institutions.get(instId);
            if (institution) {
                institution.balance += position;
                institution.obligations = { payable: 0, receivable: 0 };
            }
            if (position > 0) netVolume += position;
        }

        for (const obl of pendingObligations) {
            obl.status = 'SETTLED';
            obl.settledAt = new Date().toISOString();
            obl.cycleId = cycleId;
        }

        const nettingEfficiency = grossVolume > 0
            ? parseFloat((((grossVolume - netVolume) / grossVolume) * 100).toFixed(1))
            : 0;

        const cycle = {
            cycleId,
            timestamp: new Date().toISOString(),
            obligationsSettled: pendingObligations.length,
            grossVolume: parseFloat(grossVolume.toFixed(2)),
            netVolume: parseFloat(netVolume.toFixed(2)),
            nettingEfficiency,
            netPositions: Object.fromEntries(netPositions)
        };

        this.nettingCycles.push(cycle);
        return cycle;
    }

    /**
     * Get institution
     * @param {string} institutionId - Institution ID
     * @returns {object|null} Institution
     */
    getInstitution(institutionId) {
        return this.institutions.get(institutionId) || null;
    }

    /**
     * Get all institutions
     * @returns {object[]} Institutions
     */
    getAllInstitutions() {
        return Array.from(this.institutions.values());
    }
}

/**
 * CBDC Settlement Orchestrator
 * Coordinates retail and wholesale settlement rails
 */
class CBDCSettlementOrchestrator {
    constructor() {
        this.retailManager = new RetailWalletManager();
        this.wholesaleModule = new WholesaleNettingModule();
        
        this.settlements = [];
        this.metrics = {
            totalSettlements: 0,
            retailSettlements: 0,
            wholesaleSettlements: 0,
            totalVolume: 0,
            latencies: []
        };
    }

    /**
     * Initialize campus ecosystem
     * @returns {object} Initialized ecosystem
     */
    initializeEcosystem() {
        const retailWallets = [
            { id: 'HOSTEL-001', name: 'Mega Hostel Block-1', balance: 100000, type: 'CONSUMER' },
            { id: 'LAB-001', name: 'Research Lab', balance: 50000, type: 'CONSUMER' },
            { id: 'EV-001', name: 'EV Charging Station', balance: 25000, type: 'CONSUMER' },
            { id: 'SOLAR-001', name: 'Campus Solar Rooftop', balance: 0, type: 'PROSUMER' },
            { id: 'TREASURY-001', name: 'University Treasury', balance: 5000000, type: 'TREASURY' }
        ];

        const wholesaleInstitutions = [
            { id: 'NITJ-TREASURY', name: 'NIT Jalandhar Treasury', balance: 10000000, type: 'UNIVERSITY' },
            { id: 'PSPCL-GRID', name: 'PSPCL Punjab Grid', balance: 0, type: 'UTILITY' },
            { id: 'SBI-PARTNER', name: 'Partner Bank (SBI)', balance: 50000000, type: 'BANK' },
            { id: 'RBI-ESCROW', name: 'RBI CBDC Escrow', balance: 100000000, type: 'CENTRAL_BANK' }
        ];

        for (const w of retailWallets) {
            this.retailManager.createWallet(w.id, {
                name: w.name,
                initialBalance: w.balance,
                entityType: w.type,
                kycVerified: true
            });
        }

        for (const i of wholesaleInstitutions) {
            this.wholesaleModule.registerInstitution(i.id, {
                name: i.name,
                initialBalance: i.balance,
                type: i.type
            });
        }

        return {
            retailWallets: this.retailManager.getAllWallets(),
            wholesaleInstitutions: this.wholesaleModule.getAllInstitutions()
        };
    }

    /**
     * Execute settlement for a trade
     * @param {object} trade - Trade details
     * @param {object} policyResult - Policy engine result
     * @returns {object} Settlement result
     */
    async executeSettlement(trade, policyResult) {
        const startTime = Date.now();
        
        const settlementId = generateId('CBDC-SET');
        const amount = policyResult.settlement?.finalAmount || policyResult.tariff?.amounts?.totalAmount || 0;

        const legs = [];

        try {
            const retailLeg = {
                legId: generateId('LEG'),
                rail: RAILS.RETAIL,
                type: 'CONSUMER_TO_PROSUMER',
                amount,
                status: 'COMPLETED',
                timestamp: new Date().toISOString()
            };
            legs.push(retailLeg);
            this.metrics.retailSettlements++;

            this.wholesaleModule.addObligation(
                'NITJ-TREASURY',
                'PSPCL-GRID',
                amount * 0.1,
                settlementId
            );

            const wholesaleLeg = {
                legId: generateId('LEG'),
                rail: RAILS.WHOLESALE,
                type: 'INSTITUTIONAL_NETTING',
                amount: amount * 0.1,
                status: 'PENDING_NETTING',
                timestamp: new Date().toISOString()
            };
            legs.push(wholesaleLeg);

        } catch (error) {
            logger.error('Settlement failed', { settlementId, error: error.message });
            throw new SettlementError(error.message, settlementId);
        }

        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        this.metrics.totalSettlements++;
        this.metrics.totalVolume += amount;

        const settlement = {
            settlementId,
            tradeRef: trade.producer + '-' + trade.consumer,
            amount,
            legs,
            settlementTimeMs: latency,
            settledAt: new Date().toISOString()
        };

        this.settlements.push(settlement);

        return {
            success: true,
            settlement
        };
    }

    /**
     * Execute wholesale netting
     * @returns {object} Netting result
     */
    executeWholesaleNetting() {
        const result = this.wholesaleModule.executeNetting();
        this.metrics.wholesaleSettlements += result.obligationsSettled || 0;
        return result;
    }

    /**
     * Get settlement metrics
     * @returns {object} Metrics
     */
    getMetrics() {
        const latencies = this.metrics.latencies;

        return {
            settlements: {
                total: this.metrics.totalSettlements,
                retail: this.metrics.retailSettlements,
                wholesale: this.metrics.wholesaleSettlements,
                totalVolume: parseFloat(this.metrics.totalVolume.toFixed(2))
            },
            performance: {
                avgSettlementTimeMs: latencies.length > 0
                    ? parseFloat((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2))
                    : 0,
                p50SettlementTimeMs: Math.round(percentile(latencies, 50)),
                p95SettlementTimeMs: Math.round(percentile(latencies, 95))
            },
            ecosystem: {
                retailWallets: this.retailManager.getAllWallets().length,
                wholesaleInstitutions: this.wholesaleModule.getAllInstitutions().length
            }
        };
    }

    /**
     * Get retail wallets
     * @returns {object[]} Wallets
     */
    getRetailWallets() {
        return this.retailManager.getAllWallets();
    }

    /**
     * Get wholesale institutions
     * @returns {object[]} Institutions
     */
    getWholesaleInstitutions() {
        return this.wholesaleModule.getAllInstitutions();
    }
}

module.exports = {
    CBDCSettlementOrchestrator,
    RetailWalletManager,
    WholesaleNettingModule,
    RAILS,
    CONDITIONS,
    WALLET_STATUS
};

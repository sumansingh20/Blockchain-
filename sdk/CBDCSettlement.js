/**
 * CBDC Settlement Simulator
 * e₹-R (Retail) and e₹-W (Wholesale) Settlement Rails
 * 
 * Implements RBI CBDC pilot features:
 * - Programmable conditions
 * - Targeted transfers
 * - Escrow/allowance mechanisms
 * - Batch netting for wholesale
 * 
 * @module CBDCSettlement
 * @version 2.0.0
 */

const crypto = require('crypto');

/**
 * CBDC Wallet Types
 */
const WALLET_TYPES = {
    ERR_RETAIL: 'e₹-R',      // Retail CBDC for consumers
    ERW_WHOLESALE: 'e₹-W',    // Wholesale CBDC for institutions
    ESCROW: 'ESCROW',         // Escrow accounts
    TREASURY: 'TREASURY'      // University treasury
};

/**
 * Programmable Conditions for CBDC
 */
const CONDITIONS = {
    ENERGY_ONLY: {
        code: 'ENERGY_ONLY',
        description: 'Can only be used for campus energy payments',
        validator: (tx) => tx.purpose === 'ENERGY_TRADE'
    },
    TIME_BOUND: {
        code: 'TIME_BOUND',
        description: 'Valid only during specific hours',
        validator: (tx, params) => {
            const hour = new Date(tx.timestamp).getHours();
            return hour >= params.startHour && hour <= params.endHour;
        }
    },
    MAX_AMOUNT: {
        code: 'MAX_AMOUNT',
        description: 'Maximum transaction amount limit',
        validator: (tx, params) => tx.amount <= params.maxAmount
    },
    CAMPUS_ONLY: {
        code: 'CAMPUS_ONLY',
        description: 'Transfers only within campus ecosystem',
        validator: (tx) => tx.recipientType === 'CAMPUS_ENTITY'
    },
    KYC_VERIFIED: {
        code: 'KYC_VERIFIED',
        description: 'Requires KYC verification',
        validator: (tx, params, wallet) => wallet.kycStatus === 'VERIFIED'
    }
};

/**
 * e₹-R Retail Wallet Manager
 */
class RetailWalletManager {
    constructor() {
        this.wallets = new Map();
        this.transactions = [];
    }

    /**
     * Create a new retail wallet
     */
    createWallet(userId, userInfo = {}) {
        const walletId = `ERR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        
        const wallet = {
            walletId,
            userId,
            type: WALLET_TYPES.ERR_RETAIL,
            balance: 0,
            availableBalance: 0,
            lockedBalance: 0,
            kycStatus: userInfo.kycVerified ? 'VERIFIED' : 'PENDING',
            conditions: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            metadata: {
                name: userInfo.name || 'Unknown',
                role: userInfo.role || 'CONSUMER',
                department: userInfo.department || 'General',
                linkedUPI: userInfo.upiId || null
            },
            transactionCount: 0,
            dailyLimit: 10000,
            monthlyLimit: 100000,
            dailySpent: 0,
            monthlySpent: 0
        };

        this.wallets.set(walletId, wallet);
        return wallet;
    }

    /**
     * Add programmable condition to wallet
     */
    addCondition(walletId, conditionCode, params = {}) {
        const wallet = this.wallets.get(walletId);
        if (!wallet) throw new Error('Wallet not found');

        const condition = CONDITIONS[conditionCode];
        if (!condition) throw new Error('Invalid condition code');

        wallet.conditions.push({
            code: conditionCode,
            params,
            addedAt: new Date().toISOString()
        });

        return wallet;
    }

    /**
     * Top up wallet (from UPI/Bank)
     */
    topUp(walletId, amount, source = 'UPI') {
        const wallet = this.wallets.get(walletId);
        if (!wallet) throw new Error('Wallet not found');

        wallet.balance += amount;
        wallet.availableBalance += amount;
        wallet.lastActivity = new Date().toISOString();

        const tx = {
            txId: `TOP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            type: 'TOP_UP',
            walletId,
            amount,
            source,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED'
        };

        this.transactions.push(tx);
        return tx;
    }

    /**
     * Create escrow/allowance for energy payment
     */
    createEscrow(walletId, amount, purpose, expiresIn = 3600000) {
        const wallet = this.wallets.get(walletId);
        if (!wallet) throw new Error('Wallet not found');
        if (wallet.availableBalance < amount) throw new Error('Insufficient balance');

        const escrowId = `ESC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        
        // Lock funds
        wallet.availableBalance -= amount;
        wallet.lockedBalance += amount;

        const escrow = {
            escrowId,
            walletId,
            amount,
            purpose,
            status: 'LOCKED',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + expiresIn).toISOString(),
            conditions: wallet.conditions.map(c => c.code)
        };

        wallet.escrows = wallet.escrows || [];
        wallet.escrows.push(escrow);

        return escrow;
    }

    /**
     * Release escrow to recipient
     */
    releaseEscrow(escrowId, recipientWalletId) {
        // Find escrow
        let sourceWallet, escrow;
        for (const [wId, w] of this.wallets) {
            const found = (w.escrows || []).find(e => e.escrowId === escrowId);
            if (found) {
                sourceWallet = w;
                escrow = found;
                break;
            }
        }

        if (!escrow) throw new Error('Escrow not found');
        if (escrow.status !== 'LOCKED') throw new Error('Escrow not in locked state');

        const recipientWallet = this.wallets.get(recipientWalletId);
        if (!recipientWallet) throw new Error('Recipient wallet not found');

        // Validate conditions
        const txContext = {
            amount: escrow.amount,
            purpose: escrow.purpose,
            timestamp: new Date().toISOString(),
            recipientType: recipientWallet.metadata.role
        };

        for (const condCode of escrow.conditions) {
            const condition = CONDITIONS[condCode];
            if (condition && !condition.validator(txContext, {}, sourceWallet)) {
                throw new Error(`Condition failed: ${condCode}`);
            }
        }

        // Execute transfer
        sourceWallet.lockedBalance -= escrow.amount;
        sourceWallet.balance -= escrow.amount;
        recipientWallet.balance += escrow.amount;
        recipientWallet.availableBalance += escrow.amount;

        escrow.status = 'RELEASED';
        escrow.releasedAt = new Date().toISOString();
        escrow.recipientWalletId = recipientWalletId;

        // Update spending limits
        sourceWallet.dailySpent += escrow.amount;
        sourceWallet.monthlySpent += escrow.amount;
        sourceWallet.transactionCount++;
        recipientWallet.transactionCount++;

        const tx = {
            txId: `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            type: 'ESCROW_RELEASE',
            escrowId,
            from: sourceWallet.walletId,
            to: recipientWalletId,
            amount: escrow.amount,
            purpose: escrow.purpose,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED',
            cbdcRef: `CBDC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
        };

        this.transactions.push(tx);
        return tx;
    }

    /**
     * Direct transfer between wallets
     */
    transfer(fromWalletId, toWalletId, amount, purpose = 'ENERGY_TRADE') {
        const fromWallet = this.wallets.get(fromWalletId);
        const toWallet = this.wallets.get(toWalletId);

        if (!fromWallet) throw new Error('Source wallet not found');
        if (!toWallet) throw new Error('Destination wallet not found');
        if (fromWallet.availableBalance < amount) throw new Error('Insufficient balance');

        // Validate conditions
        const txContext = {
            amount,
            purpose,
            timestamp: new Date().toISOString(),
            recipientType: toWallet.metadata.role
        };

        for (const cond of fromWallet.conditions) {
            const condition = CONDITIONS[cond.code];
            if (condition && !condition.validator(txContext, cond.params, fromWallet)) {
                throw new Error(`Condition failed: ${cond.code}`);
            }
        }

        // Check limits
        if (fromWallet.dailySpent + amount > fromWallet.dailyLimit) {
            throw new Error('Daily limit exceeded');
        }

        // Execute transfer
        fromWallet.balance -= amount;
        fromWallet.availableBalance -= amount;
        fromWallet.dailySpent += amount;
        fromWallet.monthlySpent += amount;
        
        toWallet.balance += amount;
        toWallet.availableBalance += amount;

        fromWallet.transactionCount++;
        toWallet.transactionCount++;
        fromWallet.lastActivity = new Date().toISOString();
        toWallet.lastActivity = new Date().toISOString();

        const tx = {
            txId: `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            type: 'DIRECT_TRANSFER',
            from: fromWalletId,
            to: toWalletId,
            amount,
            purpose,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED',
            cbdcRef: `CBDC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
        };

        this.transactions.push(tx);
        return tx;
    }

    getWallet(walletId) {
        return this.wallets.get(walletId);
    }

    getAllWallets() {
        return Array.from(this.wallets.values());
    }

    getTransactions(walletId = null, limit = 50) {
        let txs = this.transactions;
        if (walletId) {
            txs = txs.filter(tx => tx.from === walletId || tx.to === walletId || tx.walletId === walletId);
        }
        return txs.slice(-limit).reverse();
    }
}

/**
 * e₹-W Wholesale Netting Module
 */
class WholesaleNettingModule {
    constructor() {
        this.institutions = new Map();
        this.positions = new Map();
        this.nettingCycles = [];
        this.currentCycle = null;
    }

    /**
     * Register an institution
     */
    registerInstitution(institutionId, info = {}) {
        const institution = {
            institutionId,
            type: WALLET_TYPES.ERW_WHOLESALE,
            name: info.name || institutionId,
            bankAccount: info.bankAccount || `NITJ-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
            balance: info.initialBalance || 0,
            netPosition: 0,
            registeredAt: new Date().toISOString()
        };

        this.institutions.set(institutionId, institution);
        this.positions.set(institutionId, []);
        return institution;
    }

    /**
     * Record a position (pending settlement)
     */
    recordPosition(fromInstitution, toInstitution, amount, reference) {
        const position = {
            positionId: `POS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            from: fromInstitution,
            to: toInstitution,
            amount,
            reference,
            timestamp: new Date().toISOString(),
            status: 'PENDING'
        };

        // Update net positions
        const fromInst = this.institutions.get(fromInstitution);
        const toInst = this.institutions.get(toInstitution);
        
        if (fromInst) fromInst.netPosition -= amount;
        if (toInst) toInst.netPosition += amount;

        // Store position
        if (this.positions.has(fromInstitution)) {
            this.positions.get(fromInstitution).push({ ...position, direction: 'OUT' });
        }
        if (this.positions.has(toInstitution)) {
            this.positions.get(toInstitution).push({ ...position, direction: 'IN' });
        }

        return position;
    }

    /**
     * Start a netting cycle
     */
    startNettingCycle() {
        this.currentCycle = {
            cycleId: `NET-${Date.now()}`,
            startedAt: new Date().toISOString(),
            positions: [],
            status: 'IN_PROGRESS'
        };

        // Collect all pending positions
        for (const [instId, positions] of this.positions) {
            const pending = positions.filter(p => p.status === 'PENDING');
            this.currentCycle.positions.push(...pending);
        }

        return this.currentCycle;
    }

    /**
     * Execute multilateral netting
     */
    executeNetting() {
        if (!this.currentCycle) throw new Error('No active netting cycle');

        const netAmounts = new Map();

        // Calculate net amounts per institution
        for (const inst of this.institutions.values()) {
            netAmounts.set(inst.institutionId, inst.netPosition);
        }

        // Execute settlements
        const settlements = [];
        for (const [instId, netAmount] of netAmounts) {
            const inst = this.institutions.get(instId);
            if (!inst) continue;

            if (netAmount > 0) {
                // Receive funds
                inst.balance += netAmount;
                settlements.push({
                    institution: instId,
                    type: 'RECEIVE',
                    amount: netAmount,
                    newBalance: inst.balance
                });
            } else if (netAmount < 0) {
                // Pay funds
                inst.balance += netAmount; // netAmount is negative
                settlements.push({
                    institution: instId,
                    type: 'PAY',
                    amount: Math.abs(netAmount),
                    newBalance: inst.balance
                });
            }

            // Reset net position
            inst.netPosition = 0;
        }

        // Mark positions as settled
        for (const [instId, positions] of this.positions) {
            positions.forEach(p => {
                if (p.status === 'PENDING') {
                    p.status = 'SETTLED';
                    p.settledAt = new Date().toISOString();
                    p.cycleId = this.currentCycle.cycleId;
                }
            });
        }

        this.currentCycle.settlements = settlements;
        this.currentCycle.completedAt = new Date().toISOString();
        this.currentCycle.status = 'COMPLETED';
        this.currentCycle.totalGrossVolume = this.currentCycle.positions.reduce((sum, p) => sum + p.amount, 0);
        this.currentCycle.totalNetVolume = settlements.reduce((sum, s) => sum + s.amount, 0);
        this.currentCycle.nettingEfficiency = this.currentCycle.totalGrossVolume > 0
            ? parseFloat((1 - this.currentCycle.totalNetVolume / this.currentCycle.totalGrossVolume) * 100).toFixed(2)
            : 0;

        this.nettingCycles.push(this.currentCycle);
        const completedCycle = this.currentCycle;
        this.currentCycle = null;

        return completedCycle;
    }

    getInstitution(institutionId) {
        return this.institutions.get(institutionId);
    }

    getAllInstitutions() {
        return Array.from(this.institutions.values());
    }

    getNettingHistory(limit = 10) {
        return this.nettingCycles.slice(-limit).reverse();
    }

    getPositions(institutionId) {
        return this.positions.get(institutionId) || [];
    }
}

/**
 * CBDC Settlement Orchestrator
 * Coordinates retail and wholesale legs
 */
class CBDCOrchestrator {
    constructor() {
        this.retailManager = new RetailWalletManager();
        this.wholesaleModule = new WholesaleNettingModule();
        this.settlementLog = [];
        this.metrics = {
            totalRetailTx: 0,
            totalWholesaleTx: 0,
            totalVolume: 0,
            avgSettlementTime: 0,
            settlementTimes: []
        };
    }

    /**
     * Initialize campus CBDC ecosystem
     */
    initializeEcosystem() {
        // Register wholesale institutions
        this.wholesaleModule.registerInstitution('NITJ_TREASURY', {
            name: 'NIT Jalandhar Treasury',
            initialBalance: 10000000
        });
        this.wholesaleModule.registerInstitution('PSPCL_GRID', {
            name: 'PSPCL Punjab Grid',
            initialBalance: 0
        });
        this.wholesaleModule.registerInstitution('PARTNER_BANK', {
            name: 'Partner Bank (SBI)',
            initialBalance: 50000000
        });
        this.wholesaleModule.registerInstitution('RBI_ESCROW', {
            name: 'RBI CBDC Escrow',
            initialBalance: 100000000
        });

        // Create sample retail wallets
        const hostelWallet = this.retailManager.createWallet('HOSTEL_001', {
            name: 'Mega Hostel Block-1',
            role: 'CONSUMER',
            department: 'Hostels',
            kycVerified: true
        });
        this.retailManager.topUp(hostelWallet.walletId, 100000);
        this.retailManager.addCondition(hostelWallet.walletId, 'ENERGY_ONLY');

        const labWallet = this.retailManager.createWallet('LAB_001', {
            name: 'Research Lab',
            role: 'CONSUMER',
            department: 'R&D',
            kycVerified: true
        });
        this.retailManager.topUp(labWallet.walletId, 50000);

        const evWallet = this.retailManager.createWallet('EV_001', {
            name: 'EV Charging Station',
            role: 'CONSUMER',
            department: 'Infrastructure',
            kycVerified: true
        });
        this.retailManager.topUp(evWallet.walletId, 25000);
        this.retailManager.addCondition(evWallet.walletId, 'TIME_BOUND', { startHour: 6, endHour: 22 });

        const solarWallet = this.retailManager.createWallet('SOLAR_001', {
            name: 'Campus Solar Rooftop',
            role: 'PRODUCER',
            department: 'Energy',
            kycVerified: true
        });

        const treasuryWallet = this.retailManager.createWallet('TREASURY', {
            name: 'University Treasury',
            role: 'TREASURY',
            department: 'Finance',
            kycVerified: true
        });
        this.retailManager.topUp(treasuryWallet.walletId, 5000000);

        return {
            retailWallets: this.retailManager.getAllWallets(),
            wholesaleInstitutions: this.wholesaleModule.getAllInstitutions()
        };
    }

    /**
     * Execute complete settlement for an energy trade
     */
    async executeSettlement(trade, tariffResult) {
        const startTime = Date.now();

        const settlement = {
            settlementId: `CBDC-SET-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            trade,
            tariff: tariffResult,
            timestamp: new Date().toISOString(),
            legs: []
        };

        try {
            // 1. Retail leg - Consumer pays
            const consumerWallet = this.retailManager.getAllWallets()
                .find(w => w.metadata.role === 'CONSUMER');
            
            const treasuryWallet = this.retailManager.getAllWallets()
                .find(w => w.metadata.role === 'TREASURY');

            if (consumerWallet && treasuryWallet) {
                // Create escrow first
                const escrow = this.retailManager.createEscrow(
                    consumerWallet.walletId,
                    tariffResult.totalAmount,
                    'ENERGY_TRADE'
                );

                // Release to treasury
                const retailTx = this.retailManager.releaseEscrow(
                    escrow.escrowId,
                    treasuryWallet.walletId
                );

                settlement.legs.push({
                    type: 'RETAIL',
                    rail: 'e₹-R',
                    txId: retailTx.txId,
                    from: consumerWallet.metadata.name,
                    to: treasuryWallet.metadata.name,
                    amount: tariffResult.totalAmount,
                    cbdcRef: retailTx.cbdcRef,
                    status: 'COMPLETED'
                });

                this.metrics.totalRetailTx++;
            }

            // 2. Wholesale leg - Record position for batch netting
            this.wholesaleModule.recordPosition(
                'NITJ_TREASURY',
                'PSPCL_GRID',
                tariffResult.totalAmount,
                settlement.settlementId
            );

            settlement.legs.push({
                type: 'WHOLESALE',
                rail: 'e₹-W',
                positionId: `POS-${settlement.settlementId}`,
                from: 'NITJ_TREASURY',
                to: 'PSPCL_GRID',
                amount: tariffResult.totalAmount,
                status: 'PENDING_NETTING'
            });

            this.metrics.totalWholesaleTx++;

            // Calculate metrics
            const settlementTime = Date.now() - startTime;
            this.metrics.settlementTimes.push(settlementTime);
            this.metrics.totalVolume += tariffResult.totalAmount;
            this.metrics.avgSettlementTime = 
                this.metrics.settlementTimes.reduce((a, b) => a + b, 0) / this.metrics.settlementTimes.length;

            settlement.settlementTimeMs = settlementTime;
            settlement.status = 'COMPLETED';
            settlement.auditTrail = {
                meterSignature: trade.signature || 'VERIFIED',
                gooId: `GOO-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
                policyOutcome: 'SETTLED',
                cbdcTxnRef: settlement.legs[0]?.cbdcRef || `CBDC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
            };

            this.settlementLog.push(settlement);

            return { success: true, settlement };

        } catch (error) {
            settlement.status = 'FAILED';
            settlement.error = error.message;
            this.settlementLog.push(settlement);
            return { success: false, error: error.message, settlement };
        }
    }

    /**
     * Execute hourly wholesale netting
     */
    executeWholesaleNetting() {
        this.wholesaleModule.startNettingCycle();
        return this.wholesaleModule.executeNetting();
    }

    /**
     * Get CBDC settlement metrics
     */
    getMetrics() {
        return {
            retail: {
                totalTransactions: this.metrics.totalRetailTx,
                wallets: this.retailManager.getAllWallets().length,
                totalVolume: this.retailManager.getTransactions().reduce((sum, tx) => 
                    tx.type !== 'TOP_UP' ? sum + (tx.amount || 0) : sum, 0)
            },
            wholesale: {
                totalTransactions: this.metrics.totalWholesaleTx,
                institutions: this.wholesaleModule.getAllInstitutions().length,
                nettingCycles: this.wholesaleModule.getNettingHistory().length
            },
            performance: {
                avgSettlementTimeMs: parseFloat(this.metrics.avgSettlementTime.toFixed(2)),
                p50SettlementTimeMs: this.calculatePercentile(50),
                p95SettlementTimeMs: this.calculatePercentile(95),
                totalVolumeSettled: parseFloat(this.metrics.totalVolume.toFixed(2))
            }
        };
    }

    calculatePercentile(p) {
        if (this.metrics.settlementTimes.length === 0) return 0;
        const sorted = [...this.metrics.settlementTimes].sort((a, b) => a - b);
        const idx = Math.ceil(sorted.length * (p / 100)) - 1;
        return sorted[Math.max(0, idx)];
    }

    getSettlementLog(limit = 50) {
        return this.settlementLog.slice(-limit).reverse();
    }

    getRetailWallets() {
        return this.retailManager.getAllWallets();
    }

    getWholesaleInstitutions() {
        return this.wholesaleModule.getAllInstitutions();
    }
}

module.exports = {
    WALLET_TYPES,
    CONDITIONS,
    RetailWalletManager,
    WholesaleNettingModule,
    CBDCOrchestrator
};

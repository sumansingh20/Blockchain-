/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * CBDC (e₹) Digital Wallet Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 * 
 * @description
 * Simulates RBI's Central Bank Digital Currency (e₹) wallet operations
 * for campus energy trading settlements. Implements instant settlement
 * between institutional wallets.
 */

'use strict';

const crypto = require('crypto');
const { Logger } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - NIT JALANDHAR CAMPUS WALLETS
// ═══════════════════════════════════════════════════════════════════════════════

const WALLET_CONFIG = {
    // Initial balances in INR (simulated)
    INITIAL_BALANCES: {
        'NITJ_MAIN': 5000000,       // ₹50,00,000 - Main Institute Account
        'NITJ_HOSTELS': 1000000,    // ₹10,00,000 - Hostel Complex
        'NITJ_ACADEMIC': 1500000,   // ₹15,00,000 - Academic Buildings
        'NITJ_SPORTS': 500000,      // ₹5,00,000 - Sports Complex
        'NITJ_WORKSHOP': 800000,    // ₹8,00,000 - Central Workshop
        'NITJ_LIBRARY': 300000,     // ₹3,00,000 - Central Library
        'NITJ_ADMIN': 700000,       // ₹7,00,000 - Administrative Block
        'PSPCL_GRID': 0,            // Grid Operator (receives payments)
        'RBI_ESCROW': 10000000      // ₹1,00,00,000 - Settlement Reserve
    },
    
    // Wallet metadata
    WALLET_INFO: {
        'NITJ_MAIN': {
            name: 'NIT Jalandhar Main Account',
            type: 'INSTITUTIONAL',
            department: 'Finance Office',
            authorized: true
        },
        'NITJ_HOSTELS': {
            name: 'Hostel Complex Account',
            type: 'DEPARTMENTAL',
            department: 'Chief Warden Office',
            authorized: true
        },
        'NITJ_ACADEMIC': {
            name: 'Academic Buildings Account',
            type: 'DEPARTMENTAL',
            department: 'Academic Section',
            authorized: true
        },
        'NITJ_SPORTS': {
            name: 'Sports Complex Account',
            type: 'DEPARTMENTAL',
            department: 'Sports Council',
            authorized: true
        },
        'NITJ_WORKSHOP': {
            name: 'Central Workshop Account',
            type: 'DEPARTMENTAL',
            department: 'Workshop Superintendent',
            authorized: true
        },
        'NITJ_LIBRARY': {
            name: 'Central Library Account',
            type: 'DEPARTMENTAL',
            department: 'Librarian',
            authorized: true
        },
        'NITJ_ADMIN': {
            name: 'Administrative Block Account',
            type: 'DEPARTMENTAL',
            department: 'Registrar Office',
            authorized: true
        },
        'PSPCL_GRID': {
            name: 'PSPCL Grid Operator',
            type: 'UTILITY',
            department: 'Punjab State Power Corp',
            authorized: true
        },
        'RBI_ESCROW': {
            name: 'RBI Settlement Reserve',
            type: 'RESERVE',
            department: 'Reserve Bank of India',
            authorized: true
        }
    },
    
    // Transaction limits
    LIMITS: {
        MIN_TRANSACTION: 0.01,      // ₹0.01
        MAX_TRANSACTION: 1000000,   // ₹10,00,000
        DAILY_LIMIT: 5000000        // ₹50,00,000 per wallet
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CBDC WALLET MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class CBDCWallet {
    constructor() {
        this.logger = new Logger('CBDCWallet');
        this.balances = { ...WALLET_CONFIG.INITIAL_BALANCES };
        this.transactions = [];
        this.dailyTotals = {};
        
        this.logger.info('CBDC Wallet Manager initialized');
        this.logger.info(`Loaded ${Object.keys(this.balances).length} wallets`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE TRANSFER OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Transfer funds between wallets
     * @param {string} fromWallet - Source wallet ID
     * @param {string} toWallet - Destination wallet ID
     * @param {number} amount - Amount in INR
     * @param {string} description - Transaction description
     * @returns {Object} Transaction details
     */
    async transfer(fromWallet, toWallet, amount, description = 'Energy settlement') {
        // Validate parameters
        this.validateTransfer(fromWallet, toWallet, amount);
        
        // Generate transaction reference
        const referenceId = this.generateReferenceId();
        const timestamp = Date.now();
        
        // Execute transfer
        this.balances[fromWallet] -= amount;
        this.balances[toWallet] += amount;
        
        // Record transaction
        const transaction = {
            referenceId,
            type: 'TRANSFER',
            from: fromWallet,
            to: toWallet,
            amount: this.round(amount),
            description,
            timestamp,
            dateTime: new Date(timestamp).toISOString(),
            status: 'COMPLETED',
            balances: {
                fromBefore: this.round(this.balances[fromWallet] + amount),
                fromAfter: this.round(this.balances[fromWallet]),
                toBefore: this.round(this.balances[toWallet] - amount),
                toAfter: this.round(this.balances[toWallet])
            }
        };
        
        this.transactions.push(transaction);
        this.updateDailyTotals(fromWallet, amount);
        
        this.logger.info(`💸 Transfer: ${fromWallet} → ${toWallet}: ₹${amount.toFixed(2)} [${referenceId}]`);
        
        return transaction;
    }

    /**
     * Process energy settlement payment
     * @param {Object} params - Settlement parameters
     * @returns {Object} Settlement result
     */
    async settleEnergy(params) {
        const {
            receiptId,
            meterId,
            kWh,
            amount,
            fromWallet = 'NITJ_MAIN',
            toWallet = 'PSPCL_GRID',
            carbonTag = 'NORMAL'
        } = params;
        
        const description = `Energy settlement: Receipt #${receiptId}, ${kWh} kWh, Meter ${meterId}`;
        
        const transfer = await this.transfer(fromWallet, toWallet, amount, description);
        
        return {
            ...transfer,
            settlement: {
                receiptId,
                meterId,
                kWh,
                carbonTag,
                ratePerKwh: this.round(amount / kWh)
            }
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validate transfer parameters
     */
    validateTransfer(fromWallet, toWallet, amount) {
        // Check wallets exist
        if (!this.balances.hasOwnProperty(fromWallet)) {
            throw new Error(`Source wallet not found: ${fromWallet}`);
        }
        
        if (!this.balances.hasOwnProperty(toWallet)) {
            throw new Error(`Destination wallet not found: ${toWallet}`);
        }
        
        // Check same wallet
        if (fromWallet === toWallet) {
            throw new Error('Cannot transfer to same wallet');
        }
        
        // Validate amount
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('Invalid amount');
        }
        
        if (amount < WALLET_CONFIG.LIMITS.MIN_TRANSACTION) {
            throw new Error(`Amount below minimum: ₹${WALLET_CONFIG.LIMITS.MIN_TRANSACTION}`);
        }
        
        if (amount > WALLET_CONFIG.LIMITS.MAX_TRANSACTION) {
            throw new Error(`Amount exceeds maximum: ₹${WALLET_CONFIG.LIMITS.MAX_TRANSACTION}`);
        }
        
        // Check balance
        if (this.balances[fromWallet] < amount) {
            throw new Error(`Insufficient balance in ${fromWallet}. Available: ₹${this.balances[fromWallet].toFixed(2)}`);
        }
        
        // Check daily limit
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `${fromWallet}_${today}`;
        const dailyTotal = this.dailyTotals[dailyKey] || 0;
        
        if (dailyTotal + amount > WALLET_CONFIG.LIMITS.DAILY_LIMIT) {
            throw new Error(`Daily limit exceeded for ${fromWallet}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BALANCE QUERIES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get wallet balance
     */
    getBalance(walletId) {
        if (!this.balances.hasOwnProperty(walletId)) {
            throw new Error(`Wallet not found: ${walletId}`);
        }
        return this.round(this.balances[walletId]);
    }

    /**
     * Get all wallet balances
     */
    getAllBalances() {
        const wallets = {};
        
        for (const [id, balance] of Object.entries(this.balances)) {
            const info = WALLET_CONFIG.WALLET_INFO[id] || {};
            wallets[id] = {
                balance: this.round(balance),
                ...info
            };
        }
        
        return wallets;
    }

    /**
     * Get total balance across all wallets
     */
    getTotalBalance() {
        return this.round(
            Object.values(this.balances).reduce((sum, bal) => sum + bal, 0)
        );
    }

    /**
     * Get wallet info
     */
    getWalletInfo(walletId) {
        if (!this.balances.hasOwnProperty(walletId)) {
            throw new Error(`Wallet not found: ${walletId}`);
        }
        
        return {
            walletId,
            balance: this.round(this.balances[walletId]),
            ...WALLET_CONFIG.WALLET_INFO[walletId]
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRANSACTION HISTORY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get transactions for a wallet
     */
    getTransactions(walletId, limit = 50) {
        return this.transactions
            .filter(tx => tx.from === walletId || tx.to === walletId)
            .slice(-limit)
            .reverse();
    }

    /**
     * Get all transactions
     */
    getAllTransactions(limit = 100) {
        return this.transactions.slice(-limit).reverse();
    }

    /**
     * Get transaction by reference ID
     */
    getTransaction(referenceId) {
        const tx = this.transactions.find(t => t.referenceId === referenceId);
        if (!tx) {
            throw new Error(`Transaction not found: ${referenceId}`);
        }
        return tx;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATISTICS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get wallet statistics
     */
    getStatistics() {
        const completedTx = this.transactions.filter(t => t.status === 'COMPLETED');
        
        const totalVolume = completedTx.reduce((sum, tx) => sum + tx.amount, 0);
        
        // Calculate PSPCL earnings (grid payments)
        const gridPayments = completedTx
            .filter(tx => tx.to === 'PSPCL_GRID')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // Daily statistics
        const today = new Date().toISOString().split('T')[0];
        const todayTx = completedTx.filter(
            tx => tx.dateTime.startsWith(today)
        );
        
        return {
            totalTransactions: this.transactions.length,
            completedTransactions: completedTx.length,
            totalVolume: this.round(totalVolume),
            gridPayments: this.round(gridPayments),
            today: {
                transactions: todayTx.length,
                volume: this.round(todayTx.reduce((sum, tx) => sum + tx.amount, 0))
            },
            walletCount: Object.keys(this.balances).length,
            totalBalance: this.getTotalBalance()
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate unique transaction reference
     */
    generateReferenceId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `CBDC-${timestamp}-${random}`;
    }

    /**
     * Update daily totals
     */
    updateDailyTotals(walletId, amount) {
        const today = new Date().toISOString().split('T')[0];
        const key = `${walletId}_${today}`;
        this.dailyTotals[key] = (this.dailyTotals[key] || 0) + amount;
    }

    /**
     * Round to 2 decimal places
     */
    round(value) {
        return Math.round(value * 100) / 100;
    }

    /**
     * Reset wallet to initial state (for testing)
     */
    reset() {
        this.balances = { ...WALLET_CONFIG.INITIAL_BALANCES };
        this.transactions = [];
        this.dailyTotals = {};
        this.logger.info('Wallet manager reset to initial state');
    }

    /**
     * Add funds to wallet (for testing/admin)
     */
    addFunds(walletId, amount, description = 'Administrative credit') {
        if (!this.balances.hasOwnProperty(walletId)) {
            throw new Error(`Wallet not found: ${walletId}`);
        }
        
        const referenceId = this.generateReferenceId();
        
        this.balances[walletId] += amount;
        
        const transaction = {
            referenceId,
            type: 'CREDIT',
            to: walletId,
            amount: this.round(amount),
            description,
            timestamp: Date.now(),
            dateTime: new Date().toISOString(),
            status: 'COMPLETED'
        };
        
        this.transactions.push(transaction);
        
        this.logger.info(`💰 Credit: ${walletId}: +₹${amount.toFixed(2)} [${referenceId}]`);
        
        return transaction;
    }
}

module.exports = CBDCWallet;

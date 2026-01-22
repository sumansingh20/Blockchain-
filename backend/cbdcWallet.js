/**
 * ============================================
 * CBDC (e₹) WALLET SIMULATOR
 * NIT JALANDHAR CAMPUS ENERGY SYSTEM
 * ============================================
 * Simulates RBI's Digital Rupee (e₹) system
 * for NIT Jalandhar campus energy settlements.
 * 
 * Features:
 * - Wallet management for all campus buildings
 * - Balance tracking in Indian Rupees (paise)
 * - Escrow/lock mechanism for settlements
 * - Conditional release based on blockchain confirmation
 * - Complete transaction history & audit trail
 * 
 * Aligned with RBI's CBDC (e₹) Retail Pilot concepts.
 * Reference: https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=54744
 */

const { v4: uuidv4 } = require('uuid');

// ============ WALLET TYPES ============

const WALLET_TYPES = {
    DEPARTMENT: 'DEPARTMENT',
    HOSTEL: 'HOSTEL',
    LAB: 'LAB',
    LIBRARY: 'LIBRARY',
    ADMIN: 'ADMIN',
    SOLAR: 'SOLAR',
    TREASURY: 'TREASURY',
    ESCROW: 'ESCROW'
};

// ============ TRANSACTION TYPES ============

const TX_TYPES = {
    CREDIT: 'CREDIT',
    DEBIT: 'DEBIT',
    LOCK: 'LOCK',
    UNLOCK: 'UNLOCK',
    ESCROW_IN: 'ESCROW_IN',
    ESCROW_OUT: 'ESCROW_OUT',
    SETTLEMENT: 'SETTLEMENT'
};

// ============ TRANSACTION STATUS ============

const TX_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REVERSED: 'REVERSED'
};

// ============ CBDC WALLET MANAGER ============

class CBDCWalletManager {
    constructor() {
        this.wallets = new Map();
        this.transactions = [];
        this.escrows = new Map();
        
        // Initialize NIT Jalandhar campus wallets
        this._initializeNITJalandharWallets();
        
        console.log('💰 CBDC Wallet Manager initialized - NIT Jalandhar Campus');
    }
    
    /**
     * Initialize NIT Jalandhar campus wallets
     * All balances in paise (1 INR = 100 paise)
     */
    _initializeNITJalandharWallets() {
        // ========== TREASURY ==========
        // NIT Jalandhar Finance Department - Main Treasury
        this.createWallet(
            'NITJ-TREASURY',
            WALLET_TYPES.TREASURY,
            'NIT Jalandhar Finance Department',
            parseInt(process.env.INITIAL_TREASURY_BALANCE) || 500000000 // ₹50,00,000
        );
        
        // ========== BOYS HOSTELS ==========
        // Mega Boys Hostel (Largest hostel with ~1500 students)
        this.createWallet(
            'NITJ-MEGA-HOSTEL',
            WALLET_TYPES.HOSTEL,
            'Mega Boys Hostel',
            100000000 // ₹10,00,000
        );
        
        // Boys Hostel 1 (BH-1)
        this.createWallet(
            'NITJ-BH1',
            WALLET_TYPES.HOSTEL,
            'Boys Hostel 1 (BH-1)',
            50000000 // ₹5,00,000
        );
        
        // Boys Hostel 2 (BH-2)
        this.createWallet(
            'NITJ-BH2',
            WALLET_TYPES.HOSTEL,
            'Boys Hostel 2 (BH-2)',
            50000000
        );
        
        // Boys Hostel 3 (BH-3)
        this.createWallet(
            'NITJ-BH3',
            WALLET_TYPES.HOSTEL,
            'Boys Hostel 3 (BH-3)',
            50000000
        );
        
        // Boys Hostel 4 (BH-4)
        this.createWallet(
            'NITJ-BH4',
            WALLET_TYPES.HOSTEL,
            'Boys Hostel 4 (BH-4)',
            50000000
        );
        
        // ========== GIRLS HOSTELS ==========
        // Girls Hostel (GH)
        this.createWallet(
            'NITJ-GH1',
            WALLET_TYPES.HOSTEL,
            'Girls Hostel 1 (GH-1)',
            50000000
        );
        
        // New Girls Hostel (GH-2)
        this.createWallet(
            'NITJ-GH2',
            WALLET_TYPES.HOSTEL,
            'Girls Hostel 2 (GH-2)',
            50000000
        );
        
        // ========== ACADEMIC DEPARTMENTS ==========
        // Computer Science & Engineering Department
        this.createWallet(
            'NITJ-CSE-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of CSE',
            30000000 // ₹3,00,000
        );
        
        // Electronics & Communication Engineering
        this.createWallet(
            'NITJ-ECE-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of ECE',
            30000000
        );
        
        // Electrical Engineering Department
        this.createWallet(
            'NITJ-EE-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of Electrical Engineering',
            25000000
        );
        
        // Mechanical Engineering Department
        this.createWallet(
            'NITJ-ME-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of Mechanical Engineering',
            25000000
        );
        
        // Civil Engineering Department
        this.createWallet(
            'NITJ-CE-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of Civil Engineering',
            20000000
        );
        
        // Chemical Engineering Department
        this.createWallet(
            'NITJ-CHE-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of Chemical Engineering',
            20000000
        );
        
        // Industrial & Production Engineering
        this.createWallet(
            'NITJ-IPE-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of IPE',
            20000000
        );
        
        // Biotechnology Department
        this.createWallet(
            'NITJ-BT-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of Biotechnology',
            15000000
        );
        
        // Textile Technology Department
        this.createWallet(
            'NITJ-TT-DEPT',
            WALLET_TYPES.DEPARTMENT,
            'Department of Textile Technology',
            15000000
        );
        
        // ========== LABS ==========
        // Central Computing Facility
        this.createWallet(
            'NITJ-CCF',
            WALLET_TYPES.LAB,
            'Central Computing Facility',
            20000000
        );
        
        // CSE Software Lab
        this.createWallet(
            'NITJ-CSE-LAB',
            WALLET_TYPES.LAB,
            'CSE Software Development Lab',
            15000000
        );
        
        // Workshop (Heavy machinery)
        this.createWallet(
            'NITJ-WORKSHOP',
            WALLET_TYPES.LAB,
            'Central Workshop',
            25000000
        );
        
        // ========== LIBRARY ==========
        this.createWallet(
            'NITJ-LIBRARY',
            WALLET_TYPES.LIBRARY,
            'Central Library',
            20000000
        );
        
        // ========== ADMIN BUILDINGS ==========
        this.createWallet(
            'NITJ-ADMIN',
            WALLET_TYPES.ADMIN,
            'Administrative Block',
            20000000
        );
        
        // ========== SOLAR INSTALLATIONS ==========
        // Main Academic Block Solar Array (100 kW)
        this.createWallet(
            'NITJ-SOLAR-MAIN',
            WALLET_TYPES.SOLAR,
            'Main Building Rooftop Solar (100 kW)',
            0 // Producers start with 0, earn from generation
        );
        
        // Library Rooftop Solar (50 kW)
        this.createWallet(
            'NITJ-SOLAR-LIBRARY',
            WALLET_TYPES.SOLAR,
            'Library Rooftop Solar (50 kW)',
            0
        );
        
        // Mega Hostel Rooftop Solar (75 kW)
        this.createWallet(
            'NITJ-SOLAR-MEGA',
            WALLET_TYPES.SOLAR,
            'Mega Hostel Rooftop Solar (75 kW)',
            0
        );
        
        // Sports Complex Solar (25 kW)
        this.createWallet(
            'NITJ-SOLAR-SPORTS',
            WALLET_TYPES.SOLAR,
            'Sports Complex Solar (25 kW)',
            0
        );
        
        // ========== ESCROW ==========
        this.createWallet(
            'NITJ-ESCROW',
            WALLET_TYPES.ESCROW,
            'NITJ Settlement Escrow',
            0
        );
    }
    
    /**
     * Create a new wallet
     */
    createWallet(walletId, type, name, initialBalance = 0) {
        if (this.wallets.has(walletId)) {
            throw new Error(`Wallet ${walletId} already exists`);
        }
        
        const wallet = {
            walletId,
            type,
            name,
            balance: initialBalance,
            lockedBalance: 0,
            availableBalance: initialBalance,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            transactionCount: 0
        };
        
        this.wallets.set(walletId, wallet);
        console.log(`   Created wallet: ${walletId} (${name}) - ₹${(initialBalance / 100).toFixed(2)}`);
        
        return wallet;
    }
    
    /**
     * Get wallet details
     */
    getWallet(walletId) {
        const wallet = this.wallets.get(walletId);
        if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
        }
        return { ...wallet };
    }
    
    /**
     * Get all wallets
     */
    getAllWallets() {
        const wallets = [];
        for (const wallet of this.wallets.values()) {
            wallets.push({
                ...wallet,
                balanceINR: `₹${(wallet.balance / 100).toFixed(2)}`,
                lockedINR: `₹${(wallet.lockedBalance / 100).toFixed(2)}`,
                availableINR: `₹${(wallet.availableBalance / 100).toFixed(2)}`
            });
        }
        return wallets;
    }
    
    /**
     * Credit amount to wallet
     */
    credit(walletId, amount, reference, description) {
        const wallet = this.wallets.get(walletId);
        if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
        }
        
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }
        
        wallet.balance += amount;
        wallet.availableBalance += amount;
        wallet.updatedAt = Date.now();
        wallet.transactionCount++;
        
        const tx = this._recordTransaction({
            type: TX_TYPES.CREDIT,
            walletId,
            amount,
            reference,
            description,
            balanceAfter: wallet.balance
        });
        
        return tx;
    }
    
    /**
     * Debit amount from wallet
     */
    debit(walletId, amount, reference, description) {
        const wallet = this.wallets.get(walletId);
        if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
        }
        
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }
        
        if (wallet.availableBalance < amount) {
            throw new Error(`Insufficient balance. Available: ₹${(wallet.availableBalance / 100).toFixed(2)}`);
        }
        
        wallet.balance -= amount;
        wallet.availableBalance -= amount;
        wallet.updatedAt = Date.now();
        wallet.transactionCount++;
        
        const tx = this._recordTransaction({
            type: TX_TYPES.DEBIT,
            walletId,
            amount,
            reference,
            description,
            balanceAfter: wallet.balance
        });
        
        return tx;
    }
    
    /**
     * Lock funds for escrow
     */
    lockFunds(walletId, amount, escrowId, reason) {
        const wallet = this.wallets.get(walletId);
        if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
        }
        
        if (wallet.availableBalance < amount) {
            throw new Error(`Insufficient available balance for lock`);
        }
        
        wallet.lockedBalance += amount;
        wallet.availableBalance -= amount;
        wallet.updatedAt = Date.now();
        
        // Create escrow record
        this.escrows.set(escrowId, {
            escrowId,
            sourceWallet: walletId,
            amount,
            reason,
            status: 'LOCKED',
            createdAt: Date.now()
        });
        
        const tx = this._recordTransaction({
            type: TX_TYPES.LOCK,
            walletId,
            amount,
            reference: escrowId,
            description: reason,
            balanceAfter: wallet.balance
        });
        
        return { tx, escrowId };
    }
    
    /**
     * Release locked funds (conditional release after energy proof)
     */
    releaseFunds(escrowId, targetWalletId, energyProof) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) {
            throw new Error(`Escrow ${escrowId} not found`);
        }
        
        if (escrow.status !== 'LOCKED') {
            throw new Error(`Escrow ${escrowId} is not in LOCKED state`);
        }
        
        const sourceWallet = this.wallets.get(escrow.sourceWallet);
        const targetWallet = this.wallets.get(targetWalletId);
        
        if (!targetWallet) {
            throw new Error(`Target wallet ${targetWalletId} not found`);
        }
        
        // Verify energy proof exists
        if (!energyProof || !energyProof.receiptId) {
            throw new Error('Valid energy proof required for fund release');
        }
        
        // Transfer from locked to target
        sourceWallet.lockedBalance -= escrow.amount;
        sourceWallet.balance -= escrow.amount;
        targetWallet.balance += escrow.amount;
        targetWallet.availableBalance += escrow.amount;
        
        sourceWallet.updatedAt = Date.now();
        targetWallet.updatedAt = Date.now();
        
        escrow.status = 'RELEASED';
        escrow.targetWallet = targetWalletId;
        escrow.energyProof = energyProof;
        escrow.releasedAt = Date.now();
        
        const tx = this._recordTransaction({
            type: TX_TYPES.SETTLEMENT,
            walletId: targetWalletId,
            amount: escrow.amount,
            reference: escrowId,
            description: `Energy settlement for receipt #${energyProof.receiptId}`,
            balanceAfter: targetWallet.balance,
            metadata: {
                sourceWallet: escrow.sourceWallet,
                energyProof
            }
        });
        
        return tx;
    }
    
    /**
     * Direct settlement (simpler flow for demo)
     */
    settlePayment(fromWalletId, toWalletId, amount, energyProof) {
        if (!energyProof || !energyProof.receiptId) {
            throw new Error('Energy proof required for settlement');
        }
        
        const fromWallet = this.wallets.get(fromWalletId);
        const toWallet = this.wallets.get(toWalletId);
        
        if (!fromWallet) {
            throw new Error(`Source wallet ${fromWalletId} not found`);
        }
        if (!toWallet) {
            throw new Error(`Target wallet ${toWalletId} not found`);
        }
        
        if (fromWallet.availableBalance < amount) {
            // Payment failure compensation - return error with compensation info
            return {
                success: false,
                error: 'Insufficient funds',
                compensation: {
                    required: amount,
                    available: fromWallet.availableBalance,
                    shortfall: amount - fromWallet.availableBalance
                },
                paymentRef: null
            };
        }
        
        // Generate payment reference
        const paymentRef = `CBDC-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
        
        // Execute transfer
        fromWallet.balance -= amount;
        fromWallet.availableBalance -= amount;
        toWallet.balance += amount;
        toWallet.availableBalance += amount;
        
        fromWallet.updatedAt = Date.now();
        toWallet.updatedAt = Date.now();
        fromWallet.transactionCount++;
        toWallet.transactionCount++;
        
        // Record transactions
        const debitTx = this._recordTransaction({
            type: TX_TYPES.SETTLEMENT,
            walletId: fromWalletId,
            amount: -amount,
            reference: paymentRef,
            description: `Energy payment for receipt #${energyProof.receiptId}`,
            balanceAfter: fromWallet.balance,
            metadata: { energyProof, counterparty: toWalletId }
        });
        
        const creditTx = this._recordTransaction({
            type: TX_TYPES.SETTLEMENT,
            walletId: toWalletId,
            amount: amount,
            reference: paymentRef,
            description: `Energy revenue for receipt #${energyProof.receiptId}`,
            balanceAfter: toWallet.balance,
            metadata: { energyProof, counterparty: fromWalletId }
        });
        
        return {
            success: true,
            paymentRef,
            amount,
            amountINR: `₹${(amount / 100).toFixed(2)}`,
            fromWallet: fromWalletId,
            toWallet: toWalletId,
            debitTxId: debitTx.txId,
            creditTxId: creditTx.txId,
            timestamp: Date.now()
        };
    }
    
    /**
     * Record a transaction
     */
    _recordTransaction(params) {
        const tx = {
            txId: `TX-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
            ...params,
            status: TX_STATUS.COMPLETED,
            timestamp: Date.now()
        };
        
        this.transactions.push(tx);
        return tx;
    }
    
    /**
     * Get transaction history
     */
    getTransactions(walletId = null, limit = 50) {
        let txs = this.transactions;
        
        if (walletId) {
            txs = txs.filter(tx => tx.walletId === walletId);
        }
        
        return txs.slice(-limit).reverse();
    }
    
    /**
     * Get settlement summary
     */
    getSettlementSummary() {
        const settlements = this.transactions.filter(tx => tx.type === TX_TYPES.SETTLEMENT);
        
        let totalSettled = 0;
        let settlementCount = 0;
        
        for (const tx of settlements) {
            if (tx.amount > 0) {
                totalSettled += tx.amount;
                settlementCount++;
            }
        }
        
        return {
            totalSettlements: settlementCount,
            totalAmountSettled: totalSettled,
            totalAmountINR: `₹${(totalSettled / 100).toFixed(2)}`
        };
    }
    
    /**
     * Get system statistics
     */
    getStats() {
        const wallets = this.getAllWallets();
        let totalBalance = 0;
        let totalLocked = 0;
        
        for (const wallet of wallets) {
            totalBalance += wallet.balance;
            totalLocked += wallet.lockedBalance;
        }
        
        return {
            totalWallets: wallets.length,
            totalBalance,
            totalBalanceINR: `₹${(totalBalance / 100).toFixed(2)}`,
            totalLocked,
            totalLockedINR: `₹${(totalLocked / 100).toFixed(2)}`,
            totalTransactions: this.transactions.length,
            ...this.getSettlementSummary()
        };
    }
}

// ============ DEMO ============

function runDemo() {
    console.log('\n' + '='.repeat(60));
    console.log('       CBDC (e₹) WALLET SIMULATOR - DEMO');
    console.log('='.repeat(60) + '\n');
    
    const manager = new CBDCWalletManager();
    
    console.log('\n📊 INITIAL WALLET BALANCES:');
    console.log('-'.repeat(50));
    for (const wallet of manager.getAllWallets()) {
        console.log(`   ${wallet.walletId.padEnd(20)} | ${wallet.balanceINR.padStart(15)}`);
    }
    
    console.log('\n\n💳 SIMULATING ENERGY SETTLEMENT:');
    console.log('-'.repeat(50));
    
    // Simulate energy settlement
    const energyProof = {
        receiptId: '1',
        tokenId: '1',
        kWh: 5.5,
        carbonTag: 'GREEN'
    };
    
    const settlement = manager.settlePayment(
        'TREASURY-MAIN',
        'SOLAR-MAIN-001',
        250000, // ₹2,500
        energyProof
    );
    
    if (settlement.success) {
        console.log(`   ✅ Settlement successful!`);
        console.log(`   Payment Ref: ${settlement.paymentRef}`);
        console.log(`   Amount: ${settlement.amountINR}`);
        console.log(`   From: ${settlement.fromWallet}`);
        console.log(`   To: ${settlement.toWallet}`);
    }
    
    console.log('\n\n📊 UPDATED WALLET BALANCES:');
    console.log('-'.repeat(50));
    for (const wallet of manager.getAllWallets()) {
        console.log(`   ${wallet.walletId.padEnd(20)} | ${wallet.balanceINR.padStart(15)}`);
    }
    
    console.log('\n\n📈 SYSTEM STATISTICS:');
    console.log('-'.repeat(50));
    const stats = manager.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n' + '='.repeat(60) + '\n');
}

// ============ EXPORTS ============

module.exports = {
    CBDCWalletManager,
    WALLET_TYPES,
    TX_TYPES,
    TX_STATUS
};

// Run demo if executed directly
if (require.main === module) {
    runDemo();
}

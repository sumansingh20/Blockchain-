/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * Blockchain Service - ethers.js Integration
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 */

'use strict';

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Logger } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8545',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    GAS_LIMIT: 500000,
    CONFIRMATIONS: 1,
    CONTRACT_ABI_PATH: path.join(__dirname, '../artifacts/contracts/EnergyLedger.sol/EnergyLedger.json'),
    DEPLOYED_ADDRESS_PATH: path.join(__dirname, '../deployedAddress.json')
};

// Carbon tag enum mapping
const CARBON_TAGS = {
    'NORMAL': 0,
    'GREEN': 1,
    'RENEWABLE': 2,
    'CERTIFIED': 3
};

const CARBON_TAG_NAMES = ['NORMAL', 'GREEN', 'RENEWABLE', 'CERTIFIED'];

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class BlockchainService {
    constructor() {
        this.logger = new Logger('Blockchain');
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.contractAddress = null;
        this.isConnected = false;
        this.pendingNonce = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initialize blockchain connection and contract
     * @returns {Promise<boolean>} Connection status
     */
    async initialize() {
        this.logger.info('Initializing blockchain connection...');
        
        try {
            // Create provider
            this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
            
            // Test connection
            const network = await this.provider.getNetwork();
            this.logger.info(`Connected to network: chainId ${network.chainId}`);
            
            // Get signer
            const accounts = await this.provider.listAccounts();
            if (accounts.length === 0) {
                throw new Error('No accounts available');
            }
            this.signer = await this.provider.getSigner(0);
            this.logger.info(`Using account: ${await this.signer.getAddress()}`);
            
            // Load contract
            await this.loadContract();
            
            this.isConnected = true;
            this.logger.success('Blockchain service initialized');
            
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Load deployed contract
     */
    async loadContract() {
        // Load ABI
        if (!fs.existsSync(CONFIG.CONTRACT_ABI_PATH)) {
            throw new Error('Contract ABI not found. Run: npx hardhat compile');
        }
        
        const contractJson = JSON.parse(fs.readFileSync(CONFIG.CONTRACT_ABI_PATH, 'utf8'));
        const abi = contractJson.abi;
        
        // Load deployed address
        if (!fs.existsSync(CONFIG.DEPLOYED_ADDRESS_PATH)) {
            throw new Error('Contract not deployed. Run: npx hardhat run scripts/deploy.js');
        }
        
        const deployedData = JSON.parse(fs.readFileSync(CONFIG.DEPLOYED_ADDRESS_PATH, 'utf8'));
        this.contractAddress = deployedData.address;
        
        // Create contract instance
        this.contract = new ethers.Contract(this.contractAddress, abi, this.signer);
        
        this.logger.info(`Contract loaded at: ${this.contractAddress}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get next nonce with tracking
     */
    async getNextNonce() {
        const currentNonce = await this.provider.getTransactionCount(
            await this.signer.getAddress(),
            'pending'
        );
        
        if (this.pendingNonce !== null && this.pendingNonce >= currentNonce) {
            this.pendingNonce++;
            return this.pendingNonce;
        }
        
        this.pendingNonce = currentNonce;
        return currentNonce;
    }

    /**
     * Execute transaction with retry logic
     */
    async executeWithRetry(operation, description) {
        let lastError;
        
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                const nonce = await this.getNextNonce();
                
                const tx = await operation({ 
                    nonce,
                    gasLimit: CONFIG.GAS_LIMIT
                });
                
                this.logger.debug(`${description}: TX ${tx.hash}`);
                
                const receipt = await tx.wait(CONFIG.CONFIRMATIONS);
                
                return { tx, receipt };
            } catch (error) {
                lastError = error;
                this.logger.warn(`${description} attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < CONFIG.RETRY_ATTEMPTS) {
                    await this.delay(CONFIG.RETRY_DELAY * attempt);
                    this.pendingNonce = null;  // Reset nonce tracking
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Generate data hash for energy reading
     */
    generateDataHash(meterId, kWhScaled, timestamp) {
        const data = `${meterId}:${kWhScaled}:${timestamp}:${crypto.randomBytes(8).toString('hex')}`;
        return ethers.keccak256(ethers.toUtf8Bytes(data));
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ENERGY RECEIPT OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Record energy receipt on blockchain
     * @param {string} meterId - Smart meter identifier
     * @param {number} kWhScaled - Energy in kWh * 1000
     * @param {number} timestamp - Unix timestamp
     * @param {string} carbonTag - NORMAL, GREEN, RENEWABLE, CERTIFIED
     * @returns {Promise<Object>} Receipt data
     */
    async recordEnergyReceipt(meterId, kWhScaled, timestamp, carbonTag = 'NORMAL') {
        this.ensureConnected();
        
        const carbonTagValue = CARBON_TAGS[carbonTag.toUpperCase()] ?? 0;
        const dataHash = this.generateDataHash(meterId, kWhScaled, timestamp);
        const signature = ethers.toUtf8Bytes('NITJ-ENERGY-' + Date.now());
        
        const { receipt } = await this.executeWithRetry(
            (overrides) => this.contract.recordEnergyReceipt(
                meterId,
                kWhScaled,
                timestamp,
                carbonTagValue,
                dataHash,
                signature,
                overrides
            ),
            `Record receipt for ${meterId}`
        );
        
        // Extract receipt ID from event
        const event = receipt.logs.find(log => {
            try {
                return this.contract.interface.parseLog(log)?.name === 'EnergyReceiptRecorded';
            } catch {
                return false;
            }
        });
        
        const parsedEvent = this.contract.interface.parseLog(event);
        const receiptId = Number(parsedEvent.args.receiptId);
        
        return {
            receiptId,
            meterId,
            kWhScaled,
            kWh: kWhScaled / 1000,
            timestamp,
            carbonTag,
            dataHash,
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
    }

    /**
     * Get energy receipt details
     */
    async getReceipt(receiptId) {
        this.ensureConnected();
        
        const result = await this.contract.getReceipt(receiptId);
        
        return {
            receiptId,
            meterId: result[0],
            kWhScaled: Number(result[1]),
            kWh: Number(result[1]) / 1000,
            timestamp: Number(result[2]),
            carbonTag: CARBON_TAG_NAMES[Number(result[3])],
            dataHash: result[4],
            recordedAt: Number(result[5]),
            isValid: result[6]
        };
    }

    /**
     * Get all receipts for a meter
     */
    async getReceiptsForMeter(meterId) {
        this.ensureConnected();
        
        const receiptIds = await this.contract.getReceiptsForMeter(meterId);
        const receipts = [];
        
        for (const id of receiptIds) {
            receipts.push(await this.getReceipt(Number(id)));
        }
        
        return receipts;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOKEN OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Mint energy token for receipt
     */
    async mintToken(receiptId) {
        this.ensureConnected();
        
        // Get receipt details for token URI
        const receipt = await this.getReceipt(receiptId);
        
        const tokenURI = JSON.stringify({
            name: `NITJ Energy Token #${receiptId}`,
            description: `Energy Certificate for ${receipt.kWh} kWh`,
            meterId: receipt.meterId,
            kWh: receipt.kWh,
            carbonTag: receipt.carbonTag,
            timestamp: receipt.timestamp,
            institution: 'Dr B R Ambedkar NIT Jalandhar',
            standard: 'ERC-721 Compatible'
        });
        
        const { receipt: txReceipt } = await this.executeWithRetry(
            (overrides) => this.contract.mintEnergyToken(receiptId, tokenURI, overrides),
            `Mint token for receipt #${receiptId}`
        );
        
        // Extract token ID from event
        const event = txReceipt.logs.find(log => {
            try {
                return this.contract.interface.parseLog(log)?.name === 'EnergyTokenMinted';
            } catch {
                return false;
            }
        });
        
        const parsedEvent = this.contract.interface.parseLog(event);
        const tokenId = Number(parsedEvent.args.tokenId);
        
        return {
            tokenId,
            receiptId,
            tokenURI,
            transactionHash: txReceipt.hash,
            blockNumber: txReceipt.blockNumber
        };
    }

    /**
     * Get token details
     */
    async getToken(tokenId) {
        this.ensureConnected();
        
        const result = await this.contract.getToken(tokenId);
        
        let metadata = {};
        try {
            metadata = JSON.parse(result[1]);
        } catch {}
        
        return {
            tokenId,
            receiptId: Number(result[0]),
            tokenURI: result[1],
            metadata,
            mintedAt: Number(result[2]),
            isBurned: result[3]
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SETTLEMENT OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Record CBDC settlement
     */
    async recordSettlement(receiptId, paymentRef, amountPaise) {
        this.ensureConnected();
        
        const { receipt: txReceipt } = await this.executeWithRetry(
            (overrides) => this.contract.recordSettlement(
                receiptId,
                paymentRef,
                amountPaise,
                overrides
            ),
            `Record settlement for receipt #${receiptId}`
        );
        
        // Extract settlement ID from event
        const event = txReceipt.logs.find(log => {
            try {
                return this.contract.interface.parseLog(log)?.name === 'SettlementRecorded';
            } catch {
                return false;
            }
        });
        
        const parsedEvent = this.contract.interface.parseLog(event);
        const settlementId = Number(parsedEvent.args.settlementId);
        
        return {
            settlementId,
            receiptId,
            paymentRef,
            amount: amountPaise / 100,
            transactionHash: txReceipt.hash,
            blockNumber: txReceipt.blockNumber
        };
    }

    /**
     * Get settlement details
     */
    async getSettlement(settlementId) {
        this.ensureConnected();
        
        const result = await this.contract.getSettlement(settlementId);
        const statusNames = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'];
        
        return {
            settlementId,
            receiptId: Number(result[0]),
            paymentRef: result[1],
            amount: Number(result[2]) / 100,
            status: statusNames[Number(result[3])],
            settledAt: Number(result[4])
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATISTICS & QUERIES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get blockchain statistics
     */
    async getStatistics() {
        this.ensureConnected();
        
        const result = await this.contract.getStatistics();
        
        return {
            receipts: Number(result[0]),
            tokens: Number(result[1]),
            settlements: Number(result[2]),
            totalEnergy: Number(result[3]) / 1000,  // kWh
            greenEnergy: Number(result[4]) / 1000,   // kWh
            settlementValue: Number(result[5]) / 100 // INR
        };
    }

    /**
     * Get total counts
     */
    async getCounts() {
        this.ensureConnected();
        
        const [receipts, tokens, settlements] = await Promise.all([
            this.contract.totalReceipts(),
            this.contract.totalTokens(),
            this.contract.totalSettlements()
        ]);
        
        return {
            receipts: Number(receipts),
            tokens: Number(tokens),
            settlements: Number(settlements)
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONNECTION MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ensure blockchain is connected
     */
    ensureConnected() {
        if (!this.isConnected || !this.contract) {
            throw new Error('Blockchain not connected');
        }
    }

    /**
     * Check connection status
     */
    async checkConnection() {
        try {
            await this.provider.getBlockNumber();
            return true;
        } catch {
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get contract address
     */
    getContractAddress() {
        return this.contractAddress;
    }

    /**
     * Get current block number
     */
    async getBlockNumber() {
        return await this.provider.getBlockNumber();
    }
}

module.exports = BlockchainService;

/**
 * Blockchain Contract Manager
 * Handles interactions with EnergyTrade smart contract
 * 
 * @module services/blockchain/ContractManager
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const { ethers } = require('ethers');
const config = require('../../config');
const { BlockchainError } = require('../../utils/errors');
const { generateId, hash } = require('../../utils/helpers');
const logger = require('../../utils/logger').child('Blockchain');

/**
 * Transaction status
 */
const TX_STATUS = Object.freeze({
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED'
});

/**
 * Event types from contract
 */
const CONTRACT_EVENTS = Object.freeze({
    TRADE_RECORDED: 'TradeRecorded',
    TRADE_DISPUTED: 'TradeDisputed',
    TRADE_RESOLVED: 'TradeResolved'
});

/**
 * Minimal ABI for EnergyTrade contract
 */
const ENERGY_TRADE_ABI = [
    'function recordTrade(string producer, string consumer, uint256 energyKWh, uint256 pricePerKWh, bytes32 dataHash, string carbonTag) external returns (bytes32)',
    'function getTrade(bytes32 tradeId) external view returns (tuple(string producer, string consumer, uint256 energyKWh, uint256 pricePerKWh, bytes32 dataHash, string carbonTag, uint256 timestamp, bool disputed))',
    'function getTradeCount() external view returns (uint256)',
    'function disputeTrade(bytes32 tradeId) external',
    'function resolveTrade(bytes32 tradeId, bool inFavorOfProducer) external',
    'event TradeRecorded(bytes32 indexed tradeId, string producer, string consumer, uint256 energyKWh, uint256 timestamp)',
    'event TradeDisputed(bytes32 indexed tradeId, address disputedBy)',
    'event TradeResolved(bytes32 indexed tradeId, bool inFavorOfProducer)'
];

/**
 * Contract Manager
 * Manages blockchain interactions with simulated fallback
 */
class ContractManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.connected = false;
        
        this.simulatedTrades = new Map();
        this.simulationMode = true;
        
        this.metrics = {
            transactionsSubmitted: 0,
            transactionsConfirmed: 0,
            transactionsFailed: 0,
            totalGasUsed: 0,
            latencies: []
        };

        this.config = {
            rpcUrl: config.blockchain.rpcUrl,
            contractAddress: config.blockchain.contractAddress,
            chainId: config.blockchain.chainId,
            gasMultiplier: config.blockchain.gasMultiplier
        };
    }

    /**
     * Initialize connection to blockchain
     * @returns {Promise<boolean>} Connection status
     */
    async initialize() {
        try {
            this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            
            const network = await this.provider.getNetwork().catch(() => null);
            
            if (!network) {
                logger.warn('Blockchain not available, using simulation mode');
                this.simulationMode = true;
                return false;
            }

            const privateKey = process.env.PRIVATE_KEY || 
                '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
            this.signer = new ethers.Wallet(privateKey, this.provider);

            this.contract = new ethers.Contract(
                this.config.contractAddress,
                ENERGY_TRADE_ABI,
                this.signer
            );

            const code = await this.provider.getCode(this.config.contractAddress);
            
            if (code === '0x') {
                logger.warn('Contract not deployed, using simulation mode');
                this.simulationMode = true;
                return false;
            }

            this.connected = true;
            this.simulationMode = false;
            logger.info('Blockchain connected', { 
                chainId: Number(network.chainId),
                contract: this.config.contractAddress 
            });
            
            return true;

        } catch (error) {
            logger.error('Blockchain initialization failed', { error: error.message });
            this.simulationMode = true;
            return false;
        }
    }

    /**
     * Record a trade on blockchain
     * @param {object} trade - Trade data
     * @returns {Promise<object>} Transaction result
     */
    async recordTrade(trade) {
        const startTime = Date.now();
        this.metrics.transactionsSubmitted++;

        const tradeData = {
            tradeId: generateId('TRD'),
            producer: trade.producer,
            consumer: trade.consumer,
            energyKWh: trade.energyKWh,
            pricePerKWh: trade.pricePerKWh || 679,
            dataHash: hash(`${trade.producer}:${trade.consumer}:${trade.energyKWh}:${Date.now()}`),
            carbonTag: trade.carbonTag || 'SOLAR',
            timestamp: new Date().toISOString()
        };

        if (this.simulationMode) {
            return this._simulateRecordTrade(tradeData, startTime);
        }

        try {
            const tx = await this.contract.recordTrade(
                tradeData.producer,
                tradeData.consumer,
                Math.round(tradeData.energyKWh * 1000),
                tradeData.pricePerKWh,
                tradeData.dataHash,
                tradeData.carbonTag
            );

            const receipt = await tx.wait();

            const latency = Date.now() - startTime;
            this.metrics.transactionsConfirmed++;
            this.metrics.totalGasUsed += Number(receipt.gasUsed);
            this.metrics.latencies.push(latency);

            return {
                success: true,
                tradeId: tradeData.tradeId,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: Number(receipt.gasUsed),
                confirmationTimeMs: latency,
                simulated: false
            };

        } catch (error) {
            this.metrics.transactionsFailed++;
            logger.error('Trade recording failed', { error: error.message });
            throw new BlockchainError(error.message, tradeData.tradeId);
        }
    }

    /**
     * Get trade by ID
     * @param {string} tradeId - Trade ID
     * @returns {Promise<object|null>} Trade data
     */
    async getTrade(tradeId) {
        if (this.simulationMode) {
            return this.simulatedTrades.get(tradeId) || null;
        }

        try {
            const trade = await this.contract.getTrade(tradeId);
            return {
                tradeId,
                producer: trade.producer,
                consumer: trade.consumer,
                energyKWh: Number(trade.energyKWh) / 1000,
                pricePerKWh: Number(trade.pricePerKWh),
                dataHash: trade.dataHash,
                carbonTag: trade.carbonTag,
                timestamp: new Date(Number(trade.timestamp) * 1000).toISOString(),
                disputed: trade.disputed
            };
        } catch (error) {
            logger.error('Failed to get trade', { tradeId, error: error.message });
            return null;
        }
    }

    /**
     * Get trade count
     * @returns {Promise<number>} Number of trades
     */
    async getTradeCount() {
        if (this.simulationMode) {
            return this.simulatedTrades.size;
        }

        try {
            const count = await this.contract.getTradeCount();
            return Number(count);
        } catch (error) {
            logger.error('Failed to get trade count', { error: error.message });
            return this.simulatedTrades.size;
        }
    }

    /**
     * Get recent trades
     * @param {number} limit - Maximum trades to return
     * @returns {object[]} Recent trades
     */
    getRecentTrades(limit = 10) {
        const trades = Array.from(this.simulatedTrades.values());
        return trades.slice(-limit).reverse();
    }

    /**
     * Get blockchain metrics
     * @returns {object} Metrics
     */
    getMetrics() {
        const latencies = this.metrics.latencies;
        const avgLatency = latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;

        return {
            connection: {
                connected: this.connected,
                simulationMode: this.simulationMode,
                contractAddress: this.config.contractAddress,
                chainId: this.config.chainId
            },
            transactions: {
                submitted: this.metrics.transactionsSubmitted,
                confirmed: this.metrics.transactionsConfirmed,
                failed: this.metrics.transactionsFailed,
                successRate: this.metrics.transactionsSubmitted > 0
                    ? parseFloat(((this.metrics.transactionsConfirmed / this.metrics.transactionsSubmitted) * 100).toFixed(1))
                    : 0
            },
            gas: {
                totalUsed: this.metrics.totalGasUsed,
                avgPerTx: this.metrics.transactionsConfirmed > 0
                    ? Math.round(this.metrics.totalGasUsed / this.metrics.transactionsConfirmed)
                    : 0
            },
            performance: {
                avgConfirmationTimeMs: Math.round(avgLatency),
                tradesRecorded: this.simulatedTrades.size
            }
        };
    }

    /**
     * Simulate trade recording
     * @private
     */
    _simulateRecordTrade(tradeData, startTime) {
        const simulatedGas = 45000 + Math.floor(Math.random() * 10000);
        const blockNumber = 1000000 + this.simulatedTrades.size;
        
        this.simulatedTrades.set(tradeData.tradeId, {
            ...tradeData,
            blockNumber,
            disputed: false
        });

        const latency = Date.now() - startTime + Math.floor(Math.random() * 50);
        this.metrics.transactionsConfirmed++;
        this.metrics.totalGasUsed += simulatedGas;
        this.metrics.latencies.push(latency);

        return {
            success: true,
            tradeId: tradeData.tradeId,
            transactionHash: '0x' + hash(tradeData.tradeId + Date.now()).slice(0, 64),
            blockNumber,
            gasUsed: simulatedGas,
            confirmationTimeMs: latency,
            simulated: true
        };
    }
}

module.exports = {
    ContractManager,
    TX_STATUS,
    CONTRACT_EVENTS
};

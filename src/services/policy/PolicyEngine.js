/**
 * Policy Engine
 * Orchestrates tariff calculation, carbon tracking, and trade settlement
 * 
 * @module services/policy/PolicyEngine
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const TariffManager = require('./TariffManager');
const CarbonManager = require('./CarbonManager');
const { generateId, percentile } = require('../../utils/helpers');
const logger = require('../../utils/logger').child('PolicyEngine');

/**
 * Policy Engine
 * Main orchestrator for energy trade policy enforcement
 */
class PolicyEngine {
    constructor() {
        this.tariffManager = new TariffManager();
        this.carbonManager = new CarbonManager();
        
        this.settlements = [];
        this.metrics = {
            totalTrades: 0,
            totalKwh: 0,
            totalSettled: 0,
            latencies: []
        };
    }

    /**
     * Process an energy trade through policy engine
     * @param {object} trade - Trade details
     * @returns {object} Complete settlement result
     */
    processTrade(trade) {
        const startTime = Date.now();
        
        const { producer, consumer, kWh, sourceType, timestamp } = trade;

        const tariff = this.tariffManager.calculate(
            kWh,
            sourceType,
            timestamp instanceof Date ? timestamp : new Date(timestamp)
        );

        const carbon = this.carbonManager.calculate(kWh, sourceType);

        const settlement = {
            settlementId: generateId('SET'),
            trade: {
                producer,
                consumer,
                kWh,
                sourceType,
                timestamp: (timestamp instanceof Date ? timestamp : new Date(timestamp)).toISOString()
            },
            tariff: {
                baseRate: tariff.tariff.baseRate,
                effectiveRate: tariff.effectiveRate,
                period: tariff.tariff.period,
                multiplier: tariff.tariff.multiplier,
                discount: tariff.tariff.discount
            },
            amounts: tariff.amounts,
            finalAmount: tariff.amounts.totalAmount,
            carbon: {
                emissions: carbon.emissions.actual,
                avoided: carbon.emissions.avoided,
                certificate: carbon.certificate?.certificateId || null
            },
            status: 'SETTLED',
            settledAt: new Date().toISOString()
        };

        const latency = Date.now() - startTime;
        
        this.settlements.push(settlement);
        this.metrics.totalTrades++;
        this.metrics.totalKwh += kWh;
        this.metrics.totalSettled += settlement.finalAmount;
        this.metrics.latencies.push(latency);

        if (this.metrics.latencies.length > 10000) {
            this.metrics.latencies.shift();
        }

        logger.debug('Trade processed', { 
            settlementId: settlement.settlementId, 
            kWh, 
            amount: settlement.finalAmount 
        });

        return {
            success: true,
            settlement,
            tariff,
            carbon,
            latencyMs: latency
        };
    }

    /**
     * Batch process multiple trades
     * @param {object[]} trades - Array of trades
     * @returns {object} Batch result
     */
    processBatch(trades) {
        const results = [];
        let successCount = 0;
        let failCount = 0;
        let totalAmount = 0;

        for (const trade of trades) {
            try {
                const result = this.processTrade(trade);
                results.push({ success: true, result });
                successCount++;
                totalAmount += result.settlement.finalAmount;
            } catch (error) {
                results.push({ success: false, error: error.message, trade });
                failCount++;
            }
        }

        return {
            batchId: generateId('BCH'),
            totalTrades: trades.length,
            successCount,
            failCount,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            results,
            processedAt: new Date().toISOString()
        };
    }

    /**
     * Get settlement by ID
     * @param {string} settlementId - Settlement ID
     * @returns {object|null} Settlement
     */
    getSettlement(settlementId) {
        return this.settlements.find(s => s.settlementId === settlementId) || null;
    }

    /**
     * Get settlement history
     * @param {object} filter - Filter options
     * @returns {object[]} Filtered settlements
     */
    getSettlements(filter = {}) {
        let results = [...this.settlements];

        if (filter.producer) {
            results = results.filter(s => s.trade.producer === filter.producer);
        }
        if (filter.consumer) {
            results = results.filter(s => s.trade.consumer === filter.consumer);
        }
        if (filter.sourceType) {
            results = results.filter(s => s.trade.sourceType === filter.sourceType);
        }
        if (filter.startDate) {
            const start = new Date(filter.startDate);
            results = results.filter(s => new Date(s.settledAt) >= start);
        }
        if (filter.endDate) {
            const end = new Date(filter.endDate);
            results = results.filter(s => new Date(s.settledAt) <= end);
        }
        if (filter.limit) {
            results = results.slice(-filter.limit);
        }

        return results;
    }

    /**
     * Get current tariff info
     * @returns {object} Current tariff
     */
    getCurrentTariff() {
        return this.tariffManager.getCurrentRate();
    }

    /**
     * Get tariff schedule
     * @returns {object} Full schedule
     */
    getTariffSchedule() {
        return this.tariffManager.getSchedule();
    }

    /**
     * Get carbon summary
     * @returns {object} Carbon metrics
     */
    getCarbonSummary() {
        return this.carbonManager.getSummary();
    }

    /**
     * Get comprehensive metrics
     * @returns {object} Engine metrics
     */
    getMetrics() {
        const latencies = this.metrics.latencies;

        return {
            trades: {
                total: this.metrics.totalTrades,
                totalKwh: parseFloat(this.metrics.totalKwh.toFixed(2)),
                totalSettled: parseFloat(this.metrics.totalSettled.toFixed(2)),
                avgTradeKwh: this.metrics.totalTrades > 0
                    ? parseFloat((this.metrics.totalKwh / this.metrics.totalTrades).toFixed(2))
                    : 0,
                avgTradeAmount: this.metrics.totalTrades > 0
                    ? parseFloat((this.metrics.totalSettled / this.metrics.totalTrades).toFixed(2))
                    : 0
            },
            latency: {
                count: latencies.length,
                avgMs: latencies.length > 0
                    ? parseFloat((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2))
                    : 0,
                p50Ms: Math.round(percentile(latencies, 50)),
                p95Ms: Math.round(percentile(latencies, 95)),
                p99Ms: Math.round(percentile(latencies, 99))
            },
            tariff: this.tariffManager.getStats(),
            carbon: this.carbonManager.getSummary()
        };
    }

    /**
     * Get real-time KPIs
     * @returns {object} KPI metrics
     */
    getKPIs() {
        const carbon = this.carbonManager.getSummary();
        const metrics = this.getMetrics();

        return {
            renewableShare: carbon.renewablePercent,
            carbonIntensity: carbon.carbonIntensity,
            avgSettlementLatency: metrics.latency.avgMs,
            p95SettlementLatency: metrics.latency.p95Ms,
            totalCertificates: carbon.certificatesIssued,
            netCarbonKg: carbon.netEmissionsKg,
            tradeThroughput: metrics.trades.total,
            avgTradeValue: metrics.trades.avgTradeAmount
        };
    }

    /**
     * Reset engine state
     */
    reset() {
        this.settlements = [];
        this.metrics = {
            totalTrades: 0,
            totalKwh: 0,
            totalSettled: 0,
            latencies: []
        };
    }
}

module.exports = PolicyEngine;

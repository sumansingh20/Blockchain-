/**
 * Time-of-Use Tariff Manager
 * Implements PSPCL Punjab commercial tariff structure
 * 
 * @module services/policy/TariffManager
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const config = require('../../config');
const { generateId } = require('../../utils/helpers');

/**
 * Tariff periods
 */
const PERIODS = Object.freeze({
    PEAK: 'PEAK',
    STANDARD: 'STANDARD',
    OFF_PEAK: 'OFF_PEAK'
});

/**
 * Time-of-Use Tariff Manager
 * Calculates energy prices based on time and source
 */
class TariffManager {
    constructor(options = {}) {
        this.baseRate = options.baseRate || config.energy.tariff.baseRate;
        this.currency = options.currency || config.energy.tariff.currency;
        
        this.touConfig = {
            peak: config.energy.timeOfUse.peak,
            standard: config.energy.timeOfUse.standard,
            offPeak: config.energy.timeOfUse.offPeak
        };

        this.discounts = {
            SOLAR: 0.15,
            BATTERY: 0.10,
            HYBRID: 0.05,
            GRID: 0
        };

        this.limits = {
            floor: config.energy.limits.priceFloor,
            cap: config.energy.limits.priceCap
        };

        this.calculations = [];
    }

    /**
     * Calculate tariff for energy consumption
     * @param {number} kWh - Energy amount
     * @param {string} sourceType - Energy source type
     * @param {Date} timestamp - Time of consumption
     * @returns {object} Tariff calculation result
     */
    calculate(kWh, sourceType, timestamp = new Date()) {
        const period = this._getPeriod(timestamp);
        const multiplier = this._getMultiplier(period);
        const discount = this.discounts[sourceType] || 0;

        const baseAmount = kWh * this.baseRate;
        const touAdjusted = baseAmount * multiplier;
        const discountAmount = touAdjusted * discount;
        let finalRate = (touAdjusted - discountAmount) / kWh;

        finalRate = Math.max(this.limits.floor, Math.min(this.limits.cap, finalRate));
        const totalAmount = kWh * finalRate;

        const calculation = {
            calculationId: generateId('TRF'),
            timestamp: new Date().toISOString(),
            input: {
                kWh,
                sourceType,
                consumptionTime: timestamp.toISOString()
            },
            tariff: {
                baseRate: this.baseRate,
                period,
                multiplier,
                discount,
                discountPercent: (discount * 100).toFixed(1) + '%'
            },
            amounts: {
                baseAmount: parseFloat(baseAmount.toFixed(2)),
                touAdjusted: parseFloat(touAdjusted.toFixed(2)),
                discountAmount: parseFloat(discountAmount.toFixed(2)),
                totalAmount: parseFloat(totalAmount.toFixed(2))
            },
            effectiveRate: parseFloat(finalRate.toFixed(4)),
            currency: this.currency
        };

        this.calculations.push(calculation);
        if (this.calculations.length > 10000) {
            this.calculations.shift();
        }

        return calculation;
    }

    /**
     * Get time-of-use period
     * @private
     */
    _getPeriod(timestamp) {
        const hour = timestamp.getHours();

        if (this.touConfig.peak.hours.includes(hour)) {
            return PERIODS.PEAK;
        }
        if (this.touConfig.offPeak.hours.includes(hour)) {
            return PERIODS.OFF_PEAK;
        }
        return PERIODS.STANDARD;
    }

    /**
     * Get multiplier for period
     * @private
     */
    _getMultiplier(period) {
        switch (period) {
            case PERIODS.PEAK:
                return this.touConfig.peak.multiplier;
            case PERIODS.OFF_PEAK:
                return this.touConfig.offPeak.multiplier;
            default:
                return this.touConfig.standard.multiplier;
        }
    }

    /**
     * Get current period and rate info
     * @returns {object} Current tariff info
     */
    getCurrentRate() {
        const now = new Date();
        const period = this._getPeriod(now);
        const multiplier = this._getMultiplier(period);

        return {
            period,
            baseRate: this.baseRate,
            multiplier,
            effectiveRate: parseFloat((this.baseRate * multiplier).toFixed(4)),
            currency: this.currency,
            validAt: now.toISOString()
        };
    }

    /**
     * Get tariff schedule
     * @returns {object} Full tariff schedule
     */
    getSchedule() {
        return {
            baseRate: this.baseRate,
            currency: this.currency,
            periods: {
                peak: {
                    hours: this.touConfig.peak.hours,
                    multiplier: this.touConfig.peak.multiplier,
                    rate: this.baseRate * this.touConfig.peak.multiplier
                },
                standard: {
                    hours: this.touConfig.standard.hours,
                    multiplier: this.touConfig.standard.multiplier,
                    rate: this.baseRate * this.touConfig.standard.multiplier
                },
                offPeak: {
                    hours: this.touConfig.offPeak.hours,
                    multiplier: this.touConfig.offPeak.multiplier,
                    rate: this.baseRate * this.touConfig.offPeak.multiplier
                }
            },
            discounts: { ...this.discounts },
            limits: { ...this.limits }
        };
    }

    /**
     * Get calculation history
     * @param {number} limit - Max records
     * @returns {object[]} Recent calculations
     */
    getHistory(limit = 100) {
        return this.calculations.slice(-limit);
    }

    /**
     * Get statistics
     * @returns {object} Tariff statistics
     */
    getStats() {
        if (this.calculations.length === 0) {
            return { totalCalculations: 0 };
        }

        let totalKwh = 0;
        let totalAmount = 0;
        const byPeriod = { PEAK: 0, STANDARD: 0, OFF_PEAK: 0 };

        for (const calc of this.calculations) {
            totalKwh += calc.input.kWh;
            totalAmount += calc.amounts.totalAmount;
            byPeriod[calc.tariff.period]++;
        }

        return {
            totalCalculations: this.calculations.length,
            totalKwh: parseFloat(totalKwh.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            avgRate: parseFloat((totalAmount / totalKwh).toFixed(4)),
            periodDistribution: byPeriod
        };
    }
}

module.exports = TariffManager;
module.exports.PERIODS = PERIODS;

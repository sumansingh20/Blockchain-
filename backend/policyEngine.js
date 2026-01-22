/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * Policy Engine - PSPCL Punjab Tariff Calculator
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 * 
 * @description
 * Implements Punjab State Power Corporation Ltd (PSPCL) tariff structure
 * for institutional/commercial consumers as per latest tariff order.
 */

'use strict';

const { Logger } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFF CONFIGURATION - PSPCL PUNJAB 2024
// ═══════════════════════════════════════════════════════════════════════════════

const TARIFF_CONFIG = {
    // Base rates (INR per kWh)
    BASE_RATE: 6.79,
    
    // Time-of-use multipliers
    PEAK_MULTIPLIER: 1.20,      // 6 PM - 10 PM (Evening Peak)
    OFF_PEAK_MULTIPLIER: 0.90,  // 10 PM - 6 AM (Night)
    NORMAL_MULTIPLIER: 1.00,    // 6 AM - 6 PM (Day)
    
    // Time periods (24-hour format)
    PEAK_START: 18,    // 6 PM
    PEAK_END: 22,      // 10 PM
    OFF_PEAK_START: 22, // 10 PM
    OFF_PEAK_END: 6,    // 6 AM
    
    // Additional charges
    ELECTRICITY_DUTY: 0.05,     // 5% of energy charges
    FUEL_SURCHARGE: 0.10,       // ₹0.10 per kWh
    METER_RENT: 50,             // ₹50 per month (pro-rated)
    
    // Demand charges (for commercial/institutional)
    DEMAND_CHARGE: 150,         // ₹150 per kVA per month
    
    // Carbon pricing (voluntary)
    CARBON_CREDIT: {
        NORMAL: 0,
        GREEN: 0.50,            // ₹0.50 per kWh discount
        RENEWABLE: 1.00,        // ₹1.00 per kWh discount
        CERTIFIED: 1.50         // ₹1.50 per kWh discount
    },
    
    // Tax rates
    GST_RATE: 0.18,             // 18% GST on services
    
    // Rounding precision
    PRECISION: 2
};

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class PolicyEngine {
    constructor() {
        this.logger = new Logger('PolicyEngine');
        this.tariff = TARIFF_CONFIG;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE PRICING CALCULATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calculate complete price for energy consumption
     * @param {number} kWh - Energy consumed in kilowatt-hours
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @param {string} carbonTag - Carbon source tag
     * @returns {Object} Detailed pricing breakdown
     */
    calculatePrice(kWh, timestamp = Date.now(), carbonTag = 'NORMAL') {
        if (kWh <= 0) {
            throw new Error('Energy consumption must be positive');
        }

        const date = new Date(timestamp);
        const hour = date.getHours();
        const period = this.getTimePeriod(hour);
        const multiplier = this.getMultiplier(period);
        
        // Base energy charge
        const baseRate = this.tariff.BASE_RATE;
        const effectiveRate = baseRate * multiplier;
        const energyCharge = kWh * effectiveRate;
        
        // Fuel surcharge
        const fuelSurcharge = kWh * this.tariff.FUEL_SURCHARGE;
        
        // Electricity duty
        const electricityDuty = energyCharge * this.tariff.ELECTRICITY_DUTY;
        
        // Carbon credit/discount
        const carbonDiscount = kWh * (this.tariff.CARBON_CREDIT[carbonTag.toUpperCase()] || 0);
        
        // Subtotal before taxes
        const subtotal = energyCharge + fuelSurcharge + electricityDuty - carbonDiscount;
        
        // Total (no GST on electricity for end consumers in most states)
        const total = Math.max(0, subtotal);
        
        return {
            // Input parameters
            kWh: this.round(kWh),
            timestamp,
            dateTime: date.toISOString(),
            carbonTag: carbonTag.toUpperCase(),
            
            // Time period info
            period,
            hour,
            multiplier,
            
            // Rates
            baseRate,
            effectiveRate: this.round(effectiveRate),
            
            // Charges breakdown
            charges: {
                energy: this.round(energyCharge),
                fuelSurcharge: this.round(fuelSurcharge),
                electricityDuty: this.round(electricityDuty),
                carbonDiscount: this.round(carbonDiscount)
            },
            
            // Totals
            subtotal: this.round(subtotal),
            total: this.round(total),
            
            // Rate summary
            avgRatePerKwh: this.round(total / kWh),
            
            // Metadata
            tariffVersion: 'PSPCL-2024-v2',
            calculatedAt: new Date().toISOString()
        };
    }

    /**
     * Get time period for given hour
     */
    getTimePeriod(hour) {
        if (hour >= this.tariff.PEAK_START && hour < this.tariff.PEAK_END) {
            return 'PEAK';
        } else if (hour >= this.tariff.OFF_PEAK_START || hour < this.tariff.OFF_PEAK_END) {
            return 'OFF_PEAK';
        } else {
            return 'NORMAL';
        }
    }

    /**
     * Get multiplier for time period
     */
    getMultiplier(period) {
        switch (period) {
            case 'PEAK':
                return this.tariff.PEAK_MULTIPLIER;
            case 'OFF_PEAK':
                return this.tariff.OFF_PEAK_MULTIPLIER;
            default:
                return this.tariff.NORMAL_MULTIPLIER;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BATCH CALCULATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calculate prices for multiple readings
     */
    calculateBatch(readings) {
        const results = readings.map(r => this.calculatePrice(r.kWh, r.timestamp, r.carbonTag));
        
        const totals = results.reduce((acc, r) => ({
            kWh: acc.kWh + r.kWh,
            total: acc.total + r.total
        }), { kWh: 0, total: 0 });
        
        return {
            readings: results,
            summary: {
                count: results.length,
                totalKwh: this.round(totals.kWh),
                totalAmount: this.round(totals.total),
                avgRatePerKwh: this.round(totals.total / totals.kWh)
            }
        };
    }

    /**
     * Estimate monthly bill
     */
    estimateMonthlyBill(avgDailyKwh, carbonTag = 'NORMAL') {
        const daysInMonth = 30;
        
        // Distribute usage across time periods (typical pattern)
        const distribution = {
            PEAK: 0.25,      // 25% during peak hours
            NORMAL: 0.55,   // 55% during normal hours
            OFF_PEAK: 0.20  // 20% during off-peak
        };
        
        let totalCharge = 0;
        const breakdown = {};
        
        for (const [period, ratio] of Object.entries(distribution)) {
            const periodKwh = avgDailyKwh * daysInMonth * ratio;
            const multiplier = this.getMultiplier(period);
            const charge = periodKwh * this.tariff.BASE_RATE * multiplier;
            
            breakdown[period] = {
                kWh: this.round(periodKwh),
                charge: this.round(charge)
            };
            
            totalCharge += charge;
        }
        
        // Add fixed and variable charges
        const fuelSurcharge = avgDailyKwh * daysInMonth * this.tariff.FUEL_SURCHARGE;
        const electricityDuty = totalCharge * this.tariff.ELECTRICITY_DUTY;
        const meterRent = this.tariff.METER_RENT;
        const carbonDiscount = avgDailyKwh * daysInMonth * (this.tariff.CARBON_CREDIT[carbonTag] || 0);
        
        const grandTotal = totalCharge + fuelSurcharge + electricityDuty + meterRent - carbonDiscount;
        
        return {
            avgDailyKwh,
            totalMonthlyKwh: this.round(avgDailyKwh * daysInMonth),
            breakdown,
            charges: {
                energyCharges: this.round(totalCharge),
                fuelSurcharge: this.round(fuelSurcharge),
                electricityDuty: this.round(electricityDuty),
                meterRent: meterRent,
                carbonDiscount: this.round(carbonDiscount)
            },
            total: this.round(grandTotal),
            carbonTag
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TARIFF INFORMATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get current tariff information
     */
    getTariffInfo() {
        return {
            provider: 'Punjab State Power Corporation Ltd (PSPCL)',
            category: 'Industrial/Institutional Supply',
            region: 'Punjab, India',
            version: 'PSPCL-2024-v2',
            effectiveDate: '2024-04-01',
            
            rates: {
                baseRate: {
                    value: this.tariff.BASE_RATE,
                    unit: 'INR/kWh',
                    description: 'Base energy charge'
                },
                fuelSurcharge: {
                    value: this.tariff.FUEL_SURCHARGE,
                    unit: 'INR/kWh',
                    description: 'Fuel and power purchase cost adjustment'
                },
                electricityDuty: {
                    value: this.tariff.ELECTRICITY_DUTY * 100,
                    unit: '%',
                    description: 'State electricity duty'
                }
            },
            
            timeOfUse: {
                peak: {
                    hours: `${this.tariff.PEAK_START}:00 - ${this.tariff.PEAK_END}:00`,
                    multiplier: this.tariff.PEAK_MULTIPLIER,
                    effectiveRate: this.round(this.tariff.BASE_RATE * this.tariff.PEAK_MULTIPLIER)
                },
                normal: {
                    hours: `${this.tariff.OFF_PEAK_END}:00 - ${this.tariff.PEAK_START}:00`,
                    multiplier: this.tariff.NORMAL_MULTIPLIER,
                    effectiveRate: this.round(this.tariff.BASE_RATE * this.tariff.NORMAL_MULTIPLIER)
                },
                offPeak: {
                    hours: `${this.tariff.OFF_PEAK_START}:00 - ${this.tariff.OFF_PEAK_END}:00`,
                    multiplier: this.tariff.OFF_PEAK_MULTIPLIER,
                    effectiveRate: this.round(this.tariff.BASE_RATE * this.tariff.OFF_PEAK_MULTIPLIER)
                }
            },
            
            carbonCredits: this.tariff.CARBON_CREDIT,
            
            note: 'Rates as per PSERC tariff order for FY 2024-25'
        };
    }

    /**
     * Get current time period information
     */
    getCurrentPeriodInfo() {
        const now = new Date();
        const hour = now.getHours();
        const period = this.getTimePeriod(hour);
        const multiplier = this.getMultiplier(period);
        
        return {
            currentTime: now.toISOString(),
            hour,
            period,
            multiplier,
            effectiveRate: this.round(this.tariff.BASE_RATE * multiplier),
            nextPeriodChange: this.getNextPeriodChange(hour)
        };
    }

    /**
     * Calculate when next period change occurs
     */
    getNextPeriodChange(currentHour) {
        if (currentHour < 6) {
            return { hour: 6, period: 'NORMAL' };
        } else if (currentHour < 18) {
            return { hour: 18, period: 'PEAK' };
        } else if (currentHour < 22) {
            return { hour: 22, period: 'OFF_PEAK' };
        } else {
            return { hour: 6, period: 'NORMAL', nextDay: true };
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Round to configured precision
     */
    round(value) {
        return Math.round(value * Math.pow(10, this.tariff.PRECISION)) / 
               Math.pow(10, this.tariff.PRECISION);
    }

    /**
     * Format currency
     */
    formatCurrency(value) {
        return `₹${this.round(value).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    /**
     * Update tariff configuration
     */
    updateTariff(updates) {
        Object.assign(this.tariff, updates);
        this.logger.info('Tariff configuration updated');
    }
}

module.exports = PolicyEngine;

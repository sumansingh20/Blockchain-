/**
 * ============================================
 * POLICY ENGINE - NIT JALANDHAR
 * ============================================
 * Calculates energy pricing based on:
 * - Punjab PSPCL (Punjab State Power Corporation Limited) rates
 * - Time of Use (ToU) rates for industrial/institutional consumers
 * - Green energy incentives (Solar rooftop)
 * 
 * Reference: PSPCL Tariff Order 2024-25
 * Category: Large Supply (LS) - Educational Institutions
 * 
 * Pricing Formula:
 * Price = BaseRate × kWh × TimeMultiplier × (1 - GreenDiscount) + Surcharges
 */

// ============ PSPCL TARIFF CONFIGURATION ============
// Based on Punjab State Electricity Regulatory Commission (PSERC) tariff

const CONFIG = {
    // PSPCL Large Supply (LS) rate for educational institutions
    // Effective from April 2024 - ₹6.79/kWh for LS category
    BASE_RATE_PER_KWH: parseInt(process.env.BASE_RATE_PER_KWH) || 679, // ₹6.79/kWh
    
    // Time-of-Use (ToU) multipliers as per PSPCL norms
    TIME_OF_USE: {
        // Peak hours in Punjab: 6 PM - 10 PM (summer) / 5 PM - 9 PM (winter)
        // Using summer schedule for Jalandhar
        PEAK: {
            startHour: parseInt(process.env.PEAK_HOUR_START) || 18,  // 6 PM
            endHour: parseInt(process.env.PEAK_HOUR_END) || 22,      // 10 PM
            multiplier: parseFloat(process.env.PEAK_MULTIPLIER) || 1.20, // 20% surcharge
            description: 'PSPCL Peak Hours (6 PM - 10 PM)'
        },
        // Off-peak hours
        OFF_PEAK: {
            multiplier: 1.0,
            description: 'Normal Hours'
        },
        // Night off-peak (discount period)
        NIGHT: {
            startHour: 22,
            endHour: 6,
            multiplier: 0.90, // 10% discount for night usage
            description: 'Night Rebate Hours (10 PM - 6 AM)'
        }
    },
    
    // Green/Solar energy incentives
    // Government of India/Punjab promotes rooftop solar with net metering
    CARBON_DISCOUNT: {
        GREEN: parseFloat(process.env.GREEN_DISCOUNT) || 0.15, // 15% incentive for solar
        NORMAL: 0.0
    },
    
    // Additional PSPCL surcharges
    SURCHARGES: {
        FUEL_ADJUSTMENT: 0.05,    // 5% fuel surcharge
        ELECTRICITY_DUTY: 0.05,   // 5% Punjab Electricity Duty
        PENSION_TRUST: 0.02       // 2% pension trust surcharge
    },
    
    // Feed-in Tariff for solar producers (per kWh exported)
    SOLAR_FEED_IN_RATE: 400, // ₹4.00/kWh for solar export to grid
    
    // NIT Jalandhar specific
    INSTITUTION: {
        name: 'National Institute of Technology Jalandhar',
        consumerId: 'PSPCL/JLD/LS/1234567',  // Sample consumer ID
        category: 'Large Supply (LS) - Educational',
        sanctionedLoad: '2500 kVA',
        connectionDate: '1987-01-01'
    }
};

// ============ POLICY ENGINE CLASS ============

class PolicyEngine {
    constructor() {
        this.config = CONFIG;
        console.log('📋 Policy Engine initialized - PSPCL Punjab Rates');
        console.log(`   Institution: ${this.config.INSTITUTION.name}`);
        console.log(`   Base Rate: ₹${(this.config.BASE_RATE_PER_KWH / 100).toFixed(2)}/kWh (PSPCL LS Category)`);
        console.log(`   Peak Hours: ${this.config.TIME_OF_USE.PEAK.startHour}:00 - ${this.config.TIME_OF_USE.PEAK.endHour}:00 (+${(this.config.TIME_OF_USE.PEAK.multiplier - 1) * 100}%)`);
        console.log(`   Night Rebate: ${this.config.TIME_OF_USE.NIGHT.startHour}:00 - ${this.config.TIME_OF_USE.NIGHT.endHour}:00 (-${(1 - this.config.TIME_OF_USE.NIGHT.multiplier) * 100}%)`);
        console.log(`   Solar Incentive: ${this.config.CARBON_DISCOUNT.GREEN * 100}%`);
    }
    
    /**
     * Determine time-of-use category based on PSPCL Punjab tariff
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {Object} { category: string, multiplier: number, description: string }
     */
    getTimeOfUse(timestamp) {
        const date = new Date(timestamp);
        const hour = date.getHours();
        
        const peak = this.config.TIME_OF_USE.PEAK;
        const night = this.config.TIME_OF_USE.NIGHT;
        
        // Check for peak hours (6 PM - 10 PM)
        if (hour >= peak.startHour && hour < peak.endHour) {
            return {
                category: 'PEAK',
                multiplier: peak.multiplier,
                hours: `${peak.startHour}:00 - ${peak.endHour}:00`,
                description: peak.description
            };
        }
        
        // Check for night rebate hours (10 PM - 6 AM)
        if (hour >= night.startHour || hour < night.endHour) {
            return {
                category: 'NIGHT',
                multiplier: night.multiplier,
                hours: `${night.startHour}:00 - ${night.endHour}:00`,
                description: night.description
            };
        }
        
        // Normal hours
        return {
            category: 'NORMAL',
            multiplier: this.config.TIME_OF_USE.OFF_PEAK.multiplier,
            hours: '6:00 - 18:00',
            description: 'Normal Hours (Day)'
        };
    }
    
    /**
     * Get carbon discount (solar incentive)
     * @param {string} carbonTag - GREEN or NORMAL
     * @returns {Object} { discount: number, description: string }
     */
    getCarbonDiscount(carbonTag) {
        const discount = this.config.CARBON_DISCOUNT[carbonTag] || 0;
        
        return {
            discount: discount,
            percentage: `${discount * 100}%`,
            description: carbonTag === 'GREEN' 
                ? 'Renewable energy discount applied' 
                : 'Standard grid energy (no discount)'
        };
    }
    
    /**
     * Calculate energy price
     * @param {number} kWh - Energy amount in kWh
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @param {string} carbonTag - GREEN or NORMAL
     * @returns {Object} Detailed pricing breakdown
     */
    calculatePrice(kWh, timestamp, carbonTag) {
        // Get time-of-use info
        const timeOfUse = this.getTimeOfUse(timestamp);
        
        // Get carbon discount
        const carbonInfo = this.getCarbonDiscount(carbonTag);
        
        // Calculate price components
        const baseAmount = this.config.BASE_RATE_PER_KWH * kWh;
        const timeAdjustedAmount = baseAmount * timeOfUse.multiplier;
        const discountAmount = timeAdjustedAmount * carbonInfo.discount;
        const finalAmount = Math.round(timeAdjustedAmount - discountAmount);
        
        return {
            // Input parameters
            input: {
                kWh: kWh,
                timestamp: timestamp,
                timestampISO: new Date(timestamp).toISOString(),
                carbonTag: carbonTag
            },
            
            // Pricing breakdown
            breakdown: {
                baseRatePerKWh: this.config.BASE_RATE_PER_KWH,
                baseRateINR: `₹${(this.config.BASE_RATE_PER_KWH / 100).toFixed(2)}`,
                baseAmount: baseAmount,
                baseAmountINR: `₹${(baseAmount / 100).toFixed(2)}`,
                
                timeOfUse: {
                    category: timeOfUse.category,
                    multiplier: timeOfUse.multiplier,
                    hours: timeOfUse.hours
                },
                timeAdjustedAmount: timeAdjustedAmount,
                timeAdjustedINR: `₹${(timeAdjustedAmount / 100).toFixed(2)}`,
                
                carbonDiscount: {
                    tag: carbonTag,
                    discount: carbonInfo.discount,
                    percentage: carbonInfo.percentage,
                    description: carbonInfo.description
                },
                discountAmount: discountAmount,
                discountAmountINR: `₹${(discountAmount / 100).toFixed(2)}`
            },
            
            // Final amount
            finalAmount: finalAmount,
            finalAmountINR: `₹${(finalAmount / 100).toFixed(2)}`,
            
            // Formula used
            formula: `(BaseRate × kWh × TimeMultiplier) - Discount`,
            calculation: `(${this.config.BASE_RATE_PER_KWH} × ${kWh} × ${timeOfUse.multiplier}) - ${discountAmount.toFixed(0)} = ${finalAmount}`
        };
    }
    
    /**
     * Validate meter data
     * @param {Object} meterData - Raw meter data
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateMeterData(meterData) {
        const errors = [];
        
        // Required fields
        if (!meterData.meterId) {
            errors.push('Missing meterId');
        }
        
        if (meterData.kWh === undefined || meterData.kWh === null) {
            errors.push('Missing kWh value');
        } else if (typeof meterData.kWh !== 'number' || meterData.kWh < 0) {
            errors.push('Invalid kWh value (must be non-negative number)');
        }
        
        if (!meterData.timestamp) {
            errors.push('Missing timestamp');
        } else if (meterData.timestamp > Date.now() + 60000) { // Allow 1 minute drift
            errors.push('Future timestamp not allowed');
        }
        
        if (!meterData.carbonTag) {
            errors.push('Missing carbonTag');
        } else if (!['GREEN', 'NORMAL'].includes(meterData.carbonTag)) {
            errors.push('Invalid carbonTag (must be GREEN or NORMAL)');
        }
        
        if (!meterData.dataHash) {
            errors.push('Missing dataHash for blockchain');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Get current policy configuration
     */
    getConfig() {
        return {
            baseRatePerKWh: this.config.BASE_RATE_PER_KWH,
            baseRateINR: `₹${(this.config.BASE_RATE_PER_KWH / 100).toFixed(2)}`,
            peakHours: {
                start: this.config.TIME_OF_USE.PEAK.startHour,
                end: this.config.TIME_OF_USE.PEAK.endHour,
                multiplier: this.config.TIME_OF_USE.PEAK.multiplier
            },
            carbonDiscounts: {
                GREEN: `${this.config.CARBON_DISCOUNT.GREEN * 100}%`,
                NORMAL: `${this.config.CARBON_DISCOUNT.NORMAL * 100}%`
            }
        };
    }
}

// ============ TEST EXAMPLES ============

function runPolicyTests() {
    console.log('\n' + '='.repeat(60));
    console.log('       POLICY ENGINE - TEST EXAMPLES');
    console.log('='.repeat(60) + '\n');
    
    const engine = new PolicyEngine();
    
    // Test scenarios
    const scenarios = [
        { 
            name: 'Off-peak GREEN energy',
            kWh: 10,
            timestamp: new Date().setHours(10, 0, 0, 0), // 10 AM
            carbonTag: 'GREEN'
        },
        { 
            name: 'Peak NORMAL energy',
            kWh: 10,
            timestamp: new Date().setHours(19, 0, 0, 0), // 7 PM (peak)
            carbonTag: 'NORMAL'
        },
        { 
            name: 'Peak GREEN energy',
            kWh: 10,
            timestamp: new Date().setHours(20, 0, 0, 0), // 8 PM (peak)
            carbonTag: 'GREEN'
        },
        { 
            name: 'Off-peak NORMAL energy',
            kWh: 10,
            timestamp: new Date().setHours(14, 0, 0, 0), // 2 PM
            carbonTag: 'NORMAL'
        }
    ];
    
    for (const scenario of scenarios) {
        console.log(`\n📊 Scenario: ${scenario.name}`);
        console.log('-'.repeat(50));
        
        const result = engine.calculatePrice(
            scenario.kWh,
            scenario.timestamp,
            scenario.carbonTag
        );
        
        console.log(`   kWh: ${result.input.kWh}`);
        console.log(`   Time: ${new Date(result.input.timestamp).toLocaleTimeString()}`);
        console.log(`   Carbon Tag: ${result.input.carbonTag}`);
        console.log(`   Time Category: ${result.breakdown.timeOfUse.category} (${result.breakdown.timeOfUse.multiplier}x)`);
        console.log(`   Base Amount: ${result.breakdown.baseAmountINR}`);
        console.log(`   After Time Adjustment: ${result.breakdown.timeAdjustedINR}`);
        console.log(`   Discount: -${result.breakdown.discountAmountINR}`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   FINAL AMOUNT: ${result.finalAmountINR}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
}

// ============ EXPORTS ============

module.exports = new PolicyEngine();

// Run tests if executed directly
if (require.main === module) {
    runPolicyTests();
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * Smart Meter Simulator - Real Campus Data
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 * 
 * @description
 * Simulates smart meter readings from various campus zones with realistic
 * consumption patterns based on NIT Jalandhar's actual infrastructure.
 */

'use strict';

const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPUS METER CONFIGURATION - NIT JALANDHAR
// ═══════════════════════════════════════════════════════════════════════════════

const CAMPUS_METERS = {
    // Hostel Complex
    'NITJ-MH1-001': {
        name: 'Mega Hostel Block-1',
        zone: 'HOSTEL',
        baseLoad: 45,        // kW average
        peakLoad: 120,       // kW peak
        carbonTag: 'NORMAL',
        occupancy: 500,      // students
        floors: 6
    },
    'NITJ-MH2-002': {
        name: 'Mega Hostel Block-2',
        zone: 'HOSTEL',
        baseLoad: 42,
        peakLoad: 115,
        carbonTag: 'NORMAL',
        occupancy: 480,
        floors: 6
    },
    'NITJ-GH1-003': {
        name: 'Girls Hostel Block-1',
        zone: 'HOSTEL',
        baseLoad: 35,
        peakLoad: 90,
        carbonTag: 'NORMAL',
        occupancy: 350,
        floors: 5
    },
    
    // Academic Buildings
    'NITJ-MB1-004': {
        name: 'Main Building',
        zone: 'ACADEMIC',
        baseLoad: 80,
        peakLoad: 200,
        carbonTag: 'GREEN',
        rooftopSolar: 50     // kW installed
    },
    'NITJ-LH1-005': {
        name: 'Lecture Hall Complex',
        zone: 'ACADEMIC',
        baseLoad: 60,
        peakLoad: 150,
        carbonTag: 'NORMAL'
    },
    'NITJ-CS1-006': {
        name: 'Computer Science Block',
        zone: 'ACADEMIC',
        baseLoad: 55,
        peakLoad: 130,
        carbonTag: 'NORMAL',
        servers: true
    },
    'NITJ-ECE-007': {
        name: 'ECE Department',
        zone: 'ACADEMIC',
        baseLoad: 50,
        peakLoad: 120,
        carbonTag: 'NORMAL',
        labs: 8
    },
    'NITJ-ME1-008': {
        name: 'Mechanical Engineering',
        zone: 'ACADEMIC',
        baseLoad: 70,
        peakLoad: 180,
        carbonTag: 'NORMAL',
        heavyMachinery: true
    },
    
    // Administrative
    'NITJ-ADM-009': {
        name: 'Administrative Block',
        zone: 'ADMIN',
        baseLoad: 40,
        peakLoad: 80,
        carbonTag: 'GREEN',
        rooftopSolar: 30
    },
    
    // Library
    'NITJ-LIB-010': {
        name: 'Central Library',
        zone: 'LIBRARY',
        baseLoad: 35,
        peakLoad: 70,
        carbonTag: 'RENEWABLE',
        rooftopSolar: 40,
        operatingHours: '08:00-22:00'
    },
    
    // Sports Complex
    'NITJ-SPT-011': {
        name: 'Sports Complex',
        zone: 'SPORTS',
        baseLoad: 25,
        peakLoad: 100,       // Floodlights during events
        carbonTag: 'NORMAL'
    },
    
    // Central Workshop
    'NITJ-WKS-012': {
        name: 'Central Workshop',
        zone: 'WORKSHOP',
        baseLoad: 90,
        peakLoad: 250,
        carbonTag: 'NORMAL',
        heavyMachinery: true
    },
    
    // Research Centers
    'NITJ-TBI-013': {
        name: 'Technology Business Incubator',
        zone: 'RESEARCH',
        baseLoad: 30,
        peakLoad: 60,
        carbonTag: 'GREEN',
        rooftopSolar: 25
    },
    
    // Faculty Housing
    'NITJ-FH1-014': {
        name: 'Faculty Housing Type-A',
        zone: 'RESIDENTIAL',
        baseLoad: 20,
        peakLoad: 50,
        carbonTag: 'NORMAL',
        units: 24
    },
    
    // Cafeteria
    'NITJ-CAF-015': {
        name: 'Central Cafeteria',
        zone: 'AMENITY',
        baseLoad: 45,
        peakLoad: 100,
        carbonTag: 'NORMAL',
        peakMealTimes: ['12:00', '19:00']
    }
};

// Consumption patterns by hour (0-23) - multiplier
const HOURLY_PATTERNS = {
    HOSTEL: [0.3, 0.2, 0.2, 0.2, 0.3, 0.4, 0.7, 0.9, 0.6, 0.4, 0.4, 0.5, 
             0.5, 0.4, 0.4, 0.5, 0.6, 0.8, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4],
    ACADEMIC: [0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.7, 1.0, 1.0, 1.0, 0.9,
               0.8, 1.0, 1.0, 1.0, 0.9, 0.6, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1],
    ADMIN: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.3, 0.6, 1.0, 1.0, 1.0, 0.9,
            0.8, 1.0, 1.0, 1.0, 0.8, 0.4, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1],
    LIBRARY: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 0.8, 1.0, 1.0, 0.9,
              0.7, 0.8, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.5, 0.3, 0.1, 0.1],
    SPORTS: [0.1, 0.1, 0.1, 0.1, 0.1, 0.3, 0.5, 0.7, 0.4, 0.3, 0.3, 0.3,
             0.3, 0.3, 0.4, 0.5, 0.7, 1.0, 1.0, 0.8, 0.5, 0.3, 0.2, 0.1],
    WORKSHOP: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.3, 0.6, 1.0, 1.0, 1.0, 0.8,
               0.5, 0.8, 1.0, 1.0, 0.8, 0.4, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1],
    RESEARCH: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.5, 0.8, 1.0, 1.0, 0.9,
               0.8, 1.0, 1.0, 1.0, 0.9, 0.7, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2],
    RESIDENTIAL: [0.4, 0.3, 0.3, 0.3, 0.3, 0.4, 0.7, 0.9, 0.5, 0.3, 0.3, 0.4,
                  0.5, 0.4, 0.4, 0.4, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.4],
    AMENITY: [0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 0.8, 0.6, 0.4, 0.4, 1.0,
              0.9, 0.5, 0.4, 0.5, 0.6, 0.8, 1.0, 0.8, 0.5, 0.3, 0.2, 0.1]
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMART METER SIMULATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class SmartMeterSimulator {
    constructor(config = {}) {
        this.apiUrl = config.apiUrl || 'http://localhost:3000/api';
        this.intervalId = null;
        this.readings = [];
        this.isRunning = false;
        
        console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║     NIT JALANDHAR - SMART METER SIMULATOR v2.0                    ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
        console.log(`📡 Configured ${Object.keys(CAMPUS_METERS).length} campus meters`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READING GENERATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate realistic reading for a meter
     */
    generateReading(meterId, timestamp = Date.now()) {
        const meter = CAMPUS_METERS[meterId];
        if (!meter) {
            throw new Error(`Unknown meter: ${meterId}`);
        }
        
        const date = new Date(timestamp);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        // Get base pattern for zone
        const pattern = HOURLY_PATTERNS[meter.zone] || HOURLY_PATTERNS.ACADEMIC;
        const hourlyMultiplier = pattern[hour];
        
        // Weekend adjustment (lower consumption)
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0;
        
        // Seasonal adjustment (higher in summer for AC)
        const month = date.getMonth();
        const seasonalMultiplier = (month >= 3 && month <= 6) ? 1.3 : 1.0;  // Apr-Jul
        
        // Random variation (±15%)
        const randomVariation = 0.85 + (Math.random() * 0.30);
        
        // Calculate consumption
        const baseKw = meter.baseLoad + (meter.peakLoad - meter.baseLoad) * hourlyMultiplier;
        const effectiveKw = baseKw * weekendMultiplier * seasonalMultiplier * randomVariation;
        
        // Convert to kWh (assuming 15-minute reading interval = 0.25 hours)
        const kWh = effectiveKw * 0.25;
        
        return {
            meterId,
            meterName: meter.name,
            zone: meter.zone,
            kWh: Math.round(kWh * 1000) / 1000,
            powerKw: Math.round(effectiveKw * 10) / 10,
            timestamp,
            dateTime: date.toISOString(),
            carbonTag: meter.carbonTag,
            metadata: {
                hour,
                dayOfWeek,
                hourlyMultiplier: Math.round(hourlyMultiplier * 100) / 100,
                weekendMultiplier,
                seasonalMultiplier
            }
        };
    }

    /**
     * Generate readings for all meters
     */
    generateAllReadings(timestamp = Date.now()) {
        const readings = [];
        
        for (const meterId of Object.keys(CAMPUS_METERS)) {
            readings.push(this.generateReading(meterId, timestamp));
        }
        
        return readings;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API SUBMISSION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Submit reading to backend API
     */
    async submitReading(reading) {
        try {
            const response = await axios.post(`${this.apiUrl}/transaction/complete`, {
                meterId: reading.meterId,
                kWh: reading.kWh,
                timestamp: reading.timestamp,
                carbonTag: reading.carbonTag,
                payerWallet: this.getWalletForZone(reading.zone),
                payeeWallet: 'PSPCL_GRID'
            });
            
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to submit reading for ${reading.meterId}:`, 
                          error.response?.data?.error || error.message);
            return null;
        }
    }

    /**
     * Submit all readings
     */
    async submitAllReadings(readings) {
        const results = [];
        
        for (const reading of readings) {
            const result = await this.submitReading(reading);
            if (result) {
                results.push(result);
                console.log(`✅ ${reading.meterId}: ${reading.kWh} kWh → ₹${result.data.pricing.total.toFixed(2)}`);
            }
            
            // Small delay between submissions
            await this.sleep(200);
        }
        
        return results;
    }

    /**
     * Get wallet ID for zone
     */
    getWalletForZone(zone) {
        const zoneWalletMap = {
            'HOSTEL': 'NITJ_HOSTELS',
            'ACADEMIC': 'NITJ_ACADEMIC',
            'ADMIN': 'NITJ_ADMIN',
            'LIBRARY': 'NITJ_LIBRARY',
            'SPORTS': 'NITJ_SPORTS',
            'WORKSHOP': 'NITJ_WORKSHOP',
            'RESEARCH': 'NITJ_ACADEMIC',
            'RESIDENTIAL': 'NITJ_MAIN',
            'AMENITY': 'NITJ_MAIN'
        };
        
        return zoneWalletMap[zone] || 'NITJ_MAIN';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SIMULATION CONTROL
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Run single simulation cycle
     */
    async runCycle() {
        console.log('\n📊 Running simulation cycle...');
        const timestamp = Date.now();
        
        const readings = this.generateAllReadings(timestamp);
        const results = await this.submitAllReadings(readings);
        
        // Summary
        const totalKwh = readings.reduce((sum, r) => sum + r.kWh, 0);
        const totalAmount = results.reduce((sum, r) => sum + (r?.data?.pricing?.total || 0), 0);
        
        console.log('\n' + '─'.repeat(60));
        console.log(`📈 Cycle Summary:`);
        console.log(`   Meters: ${readings.length}`);
        console.log(`   Total Energy: ${totalKwh.toFixed(3)} kWh`);
        console.log(`   Total Amount: ₹${totalAmount.toFixed(2)}`);
        console.log(`   Successful: ${results.length}/${readings.length}`);
        console.log('─'.repeat(60));
        
        return { readings, results, totalKwh, totalAmount };
    }

    /**
     * Start continuous simulation
     */
    start(intervalMs = 60000) {
        if (this.isRunning) {
            console.log('⚠️ Simulator already running');
            return;
        }
        
        this.isRunning = true;
        console.log(`🚀 Starting continuous simulation (interval: ${intervalMs/1000}s)`);
        
        // Run immediately
        this.runCycle();
        
        // Schedule periodic runs
        this.intervalId = setInterval(() => {
            this.runCycle();
        }, intervalMs);
    }

    /**
     * Stop simulation
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('⏹️ Simulator stopped');
    }

    /**
     * Run demo with specific scenarios
     */
    async runDemo() {
        console.log('\n🎬 Running NIT Jalandhar Energy Trade Demo\n');
        console.log('═'.repeat(60));
        
        // Scenario 1: Morning readings
        console.log('\n📌 Scenario 1: Morning Campus Activity (9 AM)');
        const morningTime = new Date();
        morningTime.setHours(9, 0, 0);
        
        const morningMeters = ['NITJ-MB1-004', 'NITJ-LH1-005', 'NITJ-ADM-009'];
        for (const meterId of morningMeters) {
            const reading = this.generateReading(meterId, morningTime.getTime());
            console.log(`   ${reading.meterName}: ${reading.kWh.toFixed(3)} kWh (${reading.powerKw} kW)`);
            await this.submitReading(reading);
            await this.sleep(500);
        }
        
        // Scenario 2: Peak hostel evening
        console.log('\n📌 Scenario 2: Evening Hostel Peak (8 PM)');
        const eveningTime = new Date();
        eveningTime.setHours(20, 0, 0);
        
        const hostelMeters = ['NITJ-MH1-001', 'NITJ-MH2-002', 'NITJ-GH1-003'];
        for (const meterId of hostelMeters) {
            const reading = this.generateReading(meterId, eveningTime.getTime());
            console.log(`   ${reading.meterName}: ${reading.kWh.toFixed(3)} kWh (${reading.powerKw} kW)`);
            await this.submitReading(reading);
            await this.sleep(500);
        }
        
        // Scenario 3: Green energy sources
        console.log('\n📌 Scenario 3: Green Energy Buildings');
        const greenMeters = ['NITJ-MB1-004', 'NITJ-LIB-010', 'NITJ-TBI-013'];
        for (const meterId of greenMeters) {
            const reading = this.generateReading(meterId);
            console.log(`   ${reading.meterName} [${reading.carbonTag}]: ${reading.kWh.toFixed(3)} kWh`);
            await this.submitReading(reading);
            await this.sleep(500);
        }
        
        console.log('\n✅ Demo completed!');
        console.log('═'.repeat(60));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY
    // ─────────────────────────────────────────────────────────────────────────

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getMeters() {
        return CAMPUS_METERS;
    }

    getMeterInfo(meterId) {
        return CAMPUS_METERS[meterId];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

const simulator = new SmartMeterSimulator();

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--demo')) {
    simulator.runDemo().catch(console.error);
} else if (args.includes('--cycle')) {
    simulator.runCycle().catch(console.error);
} else if (args.includes('--start')) {
    const interval = parseInt(args[args.indexOf('--start') + 1]) || 60000;
    simulator.start(interval);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        simulator.stop();
        process.exit(0);
    });
} else {
    console.log('Usage:');
    console.log('  node simulator.js --demo      Run demo scenarios');
    console.log('  node simulator.js --cycle     Run single cycle');
    console.log('  node simulator.js --start [ms] Start continuous simulation');
}

module.exports = SmartMeterSimulator;

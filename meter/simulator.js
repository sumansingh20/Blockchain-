/**
 * ============================================
 * SMART METER SIMULATOR
 * NIT JALANDHAR CAMPUS ENERGY SYSTEM
 * ============================================
 * Simulates smart meters for NIT Jalandhar campus:
 * - Rooftop solar installations (GREEN energy)
 * - Hostel consumption (Mega, BH-1 to BH-4, GH-1, GH-2)
 * - Department/Lab consumption (CSE, ECE, ME, etc.)
 * - Library and Admin building meters
 * 
 * Features:
 * - Realistic energy patterns based on NIT Jalandhar usage
 * - Digital signature for tamper-proof data integrity
 * - Time-based variations (Jalandhar timezone IST UTC+5:30)
 * - Carbon tagging (GREEN for solar, NORMAL for grid)
 * 
 * Location: NIT Jalandhar, GT Road, Jalandhar, Punjab 144027
 * Coordinates: 31.3962° N, 75.5346° E
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ============ CONFIGURATION ============

const METER_TYPES = {
    // Solar installations
    SOLAR_100KW: 'SOLAR_100KW',      // Main building rooftop
    SOLAR_75KW: 'SOLAR_75KW',        // Mega hostel rooftop
    SOLAR_50KW: 'SOLAR_50KW',        // Library rooftop
    SOLAR_25KW: 'SOLAR_25KW',        // Sports complex
    
    // Hostels
    MEGA_HOSTEL: 'MEGA_HOSTEL',      // ~1500 students
    BOYS_HOSTEL: 'BOYS_HOSTEL',      // BH-1 to BH-4 (~300 each)
    GIRLS_HOSTEL: 'GIRLS_HOSTEL',    // GH-1, GH-2
    
    // Academic
    DEPARTMENT: 'DEPARTMENT',         // CSE, ECE, ME, etc.
    LAB: 'LAB',                       // CCF, Software Lab, Workshop
    LIBRARY: 'LIBRARY',               // Central Library
    ADMIN: 'ADMIN'                    // Administrative Block
};

const CARBON_TAGS = {
    GREEN: 'GREEN',     // Renewable solar energy
    NORMAL: 'NORMAL'    // Punjab State Grid (coal/mixed)
};

// ============ NIT JALANDHAR METER CONFIGURATIONS ============
// Based on typical consumption patterns for educational institutions in Punjab

const METER_CONFIGS = {
    // ========== SOLAR INSTALLATIONS ==========
    // Main Building Rooftop Solar (100 kW capacity)
    SOLAR_100KW: {
        prefix: 'NITJ-SOLAR-MAIN',
        carbonTag: CARBON_TAGS.GREEN,
        baseOutput: 80.0,      // 80 kWh base per reading (accounting for efficiency)
        variance: 15.0,
        isProducer: true,
        capacity: '100 kW',
        location: 'Main Academic Block Rooftop',
        // Punjab solar irradiance pattern (Jalandhar gets ~5.5 peak sun hours)
        hourlyFactors: [
            0, 0, 0, 0, 0, 0.05,           // 00:00 - 05:00 (no sun)
            0.15, 0.35, 0.55, 0.75, 0.90, 0.95,  // 06:00 - 11:00 (sunrise ~6:30 AM)
            1.0, 0.98, 0.90, 0.75, 0.55, 0.30,   // 12:00 - 17:00 (peak at noon)
            0.10, 0, 0, 0, 0, 0             // 18:00 - 23:00 (sunset ~6:30 PM)
        ]
    },
    
    // Mega Hostel Rooftop Solar (75 kW capacity)
    SOLAR_75KW: {
        prefix: 'NITJ-SOLAR-MEGA',
        carbonTag: CARBON_TAGS.GREEN,
        baseOutput: 60.0,
        variance: 12.0,
        isProducer: true,
        capacity: '75 kW',
        location: 'Mega Boys Hostel Rooftop',
        hourlyFactors: [
            0, 0, 0, 0, 0, 0.05,
            0.15, 0.35, 0.55, 0.75, 0.90, 0.95,
            1.0, 0.98, 0.90, 0.75, 0.55, 0.30,
            0.10, 0, 0, 0, 0, 0
        ]
    },
    
    // Library Rooftop Solar (50 kW capacity)
    SOLAR_50KW: {
        prefix: 'NITJ-SOLAR-LIBRARY',
        carbonTag: CARBON_TAGS.GREEN,
        baseOutput: 40.0,
        variance: 8.0,
        isProducer: true,
        capacity: '50 kW',
        location: 'Central Library Rooftop',
        hourlyFactors: [
            0, 0, 0, 0, 0, 0.05,
            0.15, 0.35, 0.55, 0.75, 0.90, 0.95,
            1.0, 0.98, 0.90, 0.75, 0.55, 0.30,
            0.10, 0, 0, 0, 0, 0
        ]
    },
    
    // Sports Complex Solar (25 kW capacity)
    SOLAR_25KW: {
        prefix: 'NITJ-SOLAR-SPORTS',
        carbonTag: CARBON_TAGS.GREEN,
        baseOutput: 20.0,
        variance: 4.0,
        isProducer: true,
        capacity: '25 kW',
        location: 'Sports Complex',
        hourlyFactors: [
            0, 0, 0, 0, 0, 0.05,
            0.15, 0.35, 0.55, 0.75, 0.90, 0.95,
            1.0, 0.98, 0.90, 0.75, 0.55, 0.30,
            0.10, 0, 0, 0, 0, 0
        ]
    },
    
    // ========== HOSTELS ==========
    // Mega Boys Hostel (~1500 students, highest consumption)
    MEGA_HOSTEL: {
        prefix: 'NITJ-MEGA-HOSTEL',
        carbonTag: CARBON_TAGS.NORMAL,
        baseOutput: 150.0,     // High base due to large occupancy
        variance: 40.0,
        isProducer: false,
        capacity: '500 kVA',
        location: 'Mega Boys Hostel, NIT Jalandhar',
        occupancy: 1500,
        // Hostel consumption: high morning (bathing), low day, peak evening (study/AC)
        hourlyFactors: [
            0.25, 0.20, 0.15, 0.15, 0.20, 0.45,  // 00:00 - 05:00 (night, some AC)
            0.80, 0.95, 0.70, 0.35, 0.30, 0.40,  // 06:00 - 11:00 (morning rush)
            0.50, 0.45, 0.40, 0.45, 0.55, 0.70,  // 12:00 - 17:00 (students in class)
            0.90, 1.0, 1.0, 0.95, 0.70, 0.45     // 18:00 - 23:00 (evening peak, study)
        ]
    },
    
    // Regular Boys Hostels (BH-1, BH-2, BH-3, BH-4 - ~300 students each)
    BOYS_HOSTEL: {
        prefix: 'NITJ-BH',
        carbonTag: CARBON_TAGS.NORMAL,
        baseOutput: 35.0,
        variance: 12.0,
        isProducer: false,
        capacity: '150 kVA',
        location: 'Boys Hostel Block, NIT Jalandhar',
        occupancy: 300,
        hourlyFactors: [
            0.25, 0.20, 0.15, 0.15, 0.20, 0.45,
            0.80, 0.95, 0.70, 0.35, 0.30, 0.40,
            0.50, 0.45, 0.40, 0.45, 0.55, 0.70,
            0.90, 1.0, 1.0, 0.95, 0.70, 0.45
        ]
    },
    
    // Girls Hostels (GH-1, GH-2)
    GIRLS_HOSTEL: {
        prefix: 'NITJ-GH',
        carbonTag: CARBON_TAGS.NORMAL,
        baseOutput: 30.0,
        variance: 10.0,
        isProducer: false,
        capacity: '125 kVA',
        location: 'Girls Hostel, NIT Jalandhar',
        occupancy: 250,
        hourlyFactors: [
            0.25, 0.20, 0.15, 0.15, 0.20, 0.45,
            0.80, 0.95, 0.70, 0.35, 0.30, 0.40,
            0.50, 0.45, 0.40, 0.45, 0.55, 0.70,
            0.90, 1.0, 1.0, 0.95, 0.70, 0.45
        ]
    },
    
    // ========== ACADEMIC DEPARTMENTS ==========
    DEPARTMENT: {
        prefix: 'NITJ-DEPT',
        carbonTag: CARBON_TAGS.NORMAL,
        baseOutput: 45.0,
        variance: 15.0,
        isProducer: false,
        capacity: '200 kVA',
        location: 'Academic Block, NIT Jalandhar',
        // Working hours consumption (9 AM - 5 PM peak)
        hourlyFactors: [
            0.10, 0.10, 0.10, 0.10, 0.10, 0.10,  // 00:00 - 05:00 (security lights only)
            0.15, 0.25, 0.70, 0.90, 1.0, 0.95,   // 06:00 - 11:00 (classes start 8:30)
            0.70, 0.85, 1.0, 1.0, 0.90, 0.60,    // 12:00 - 17:00 (afternoon classes)
            0.30, 0.20, 0.15, 0.12, 0.10, 0.10   // 18:00 - 23:00 (evening - mostly closed)
        ]
    },
    
    // ========== LABS ==========
    LAB: {
        prefix: 'NITJ-LAB',
        carbonTag: CARBON_TAGS.NORMAL,
        baseOutput: 60.0,      // High due to computers/equipment
        variance: 20.0,
        isProducer: false,
        capacity: '250 kVA',
        location: 'Laboratory Block, NIT Jalandhar',
        // Lab hours with evening extension
        hourlyFactors: [
            0.08, 0.08, 0.08, 0.08, 0.08, 0.08,  // 00:00 - 05:00 (servers running)
            0.12, 0.20, 0.75, 1.0, 1.0, 0.85,    // 06:00 - 11:00 (morning labs)
            0.50, 0.80, 1.0, 1.0, 0.95, 0.70,    // 12:00 - 17:00 (afternoon labs)
            0.50, 0.40, 0.25, 0.15, 0.10, 0.08   // 18:00 - 23:00 (some late labs)
        ]
    },
    
    // ========== CENTRAL LIBRARY ==========
    LIBRARY: {
        prefix: 'NITJ-LIBRARY',
        carbonTag: CARBON_TAGS.NORMAL,
        baseOutput: 35.0,
        variance: 8.0,
        isProducer: false,
        capacity: '150 kVA',
        location: 'Central Library, NIT Jalandhar',
        // Library hours: 8 AM - 10 PM
        hourlyFactors: [
            0.10, 0.10, 0.10, 0.10, 0.10, 0.10,  // 00:00 - 05:00
            0.12, 0.20, 0.60, 0.80, 0.90, 0.85,  // 06:00 - 11:00
            0.70, 0.75, 0.85, 0.90, 0.95, 1.0,   // 12:00 - 17:00
            1.0, 0.95, 0.80, 0.50, 0.15, 0.10    // 18:00 - 23:00 (closes 10 PM)
        ]
    },
    
    // ========== ADMINISTRATIVE BLOCK ==========
    ADMIN: {
        prefix: 'NITJ-ADMIN',
        carbonTag: CARBON_TAGS.NORMAL,
        baseOutput: 25.0,
        variance: 6.0,
        isProducer: false,
        capacity: '100 kVA',
        location: 'Administrative Block, NIT Jalandhar',
        // Office hours: 9 AM - 5 PM
        hourlyFactors: [
            0.08, 0.08, 0.08, 0.08, 0.08, 0.08,  // 00:00 - 05:00
            0.10, 0.15, 0.50, 0.90, 1.0, 0.95,   // 06:00 - 11:00
            0.70, 0.85, 1.0, 1.0, 0.90, 0.40,    // 12:00 - 17:00
            0.15, 0.10, 0.08, 0.08, 0.08, 0.08   // 18:00 - 23:00
        ]
    }
};

// Legacy type mappings for backward compatibility
const LEGACY_METER_TYPES = {
    SOLAR: 'SOLAR_100KW',
    HOSTEL: 'BOYS_HOSTEL',
    LAB: 'LAB'
};

// ============ DIGITAL SIGNATURE ============

/**
 * Generate a signing key pair for the meter
 * In production, this would be hardware-based
 */
function generateMeterKeys() {
    // Using HMAC-based signature for simplicity
    // In production, use asymmetric keys (RSA/ECDSA)
    const secretKey = crypto.randomBytes(32).toString('hex');
    return { secretKey };
}

/**
 * Sign meter data for integrity verification
 */
function signMeterData(data, secretKey) {
    const dataString = JSON.stringify({
        meterId: data.meterId,
        kWh: data.kWh,
        timestamp: data.timestamp,
        carbonTag: data.carbonTag,
        type: data.type
    });
    
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(dataString)
        .digest('hex');
    
    return signature;
}

/**
 * Verify meter data signature
 */
function verifySignature(data, signature, secretKey) {
    const expectedSignature = signMeterData(data, secretKey);
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

/**
 * Generate data hash for blockchain (replay prevention)
 */
function generateDataHash(data) {
    const hashInput = `${data.meterId}:${data.kWh}:${data.timestamp}:${data.nonce}`;
    return '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
}

// ============ METER SIMULATION ============

class SmartMeter {
    constructor(type, id = null) {
        if (!METER_CONFIGS[type]) {
            throw new Error(`Invalid meter type: ${type}`);
        }
        
        this.config = METER_CONFIGS[type];
        this.type = type;
        this.meterId = id || `${this.config.prefix}-${uuidv4().slice(0, 8).toUpperCase()}`;
        this.keys = generateMeterKeys();
        this.readingCount = 0;
        
        console.log(`[METER] Initialized ${this.type} meter: ${this.meterId}`);
    }
    
    /**
     * Generate a single meter reading
     */
    generateReading(customTimestamp = null) {
        const timestamp = customTimestamp || Date.now();
        const date = new Date(timestamp);
        const hour = date.getHours();
        
        // Calculate energy based on time of day
        const hourlyFactor = this.config.hourlyFactors[hour];
        const baseEnergy = this.config.baseOutput * hourlyFactor;
        const variance = (Math.random() - 0.5) * this.config.variance;
        const kWh = Math.max(0, baseEnergy + variance);
        
        // Round to 3 decimal places
        const roundedKWh = Math.round(kWh * 1000) / 1000;
        
        // Generate unique nonce for this reading
        const nonce = uuidv4();
        
        const reading = {
            meterId: this.meterId,
            type: this.type,
            kWh: roundedKWh,
            kWhScaled: Math.round(roundedKWh * 1000), // For smart contract (no decimals)
            timestamp: timestamp,
            timestampISO: date.toISOString(),
            carbonTag: this.config.carbonTag,
            isProducer: this.config.isProducer,
            nonce: nonce,
            readingNumber: ++this.readingCount
        };
        
        // Sign the reading
        reading.signature = signMeterData(reading, this.keys.secretKey);
        
        // Generate hash for blockchain
        reading.dataHash = generateDataHash(reading);
        
        return reading;
    }
    
    /**
     * Verify a reading's signature
     */
    verifyReading(reading) {
        return verifySignature(reading, reading.signature, this.keys.secretKey);
    }
    
    /**
     * Get meter info
     */
    getInfo() {
        return {
            meterId: this.meterId,
            type: this.type,
            carbonTag: this.config.carbonTag,
            isProducer: this.config.isProducer,
            totalReadings: this.readingCount
        };
    }
}

// ============ METER FLEET MANAGER ============

class MeterFleet {
    constructor() {
        this.meters = new Map();
    }
    
    /**
     * Add a meter to the fleet
     */
    addMeter(type, id = null) {
        const meter = new SmartMeter(type, id);
        this.meters.set(meter.meterId, meter);
        return meter;
    }
    
    /**
     * Get a meter by ID
     */
    getMeter(meterId) {
        return this.meters.get(meterId);
    }
    
    /**
     * Generate readings from all meters
     */
    generateAllReadings(customTimestamp = null) {
        const readings = [];
        for (const meter of this.meters.values()) {
            readings.push(meter.generateReading(customTimestamp));
        }
        return readings;
    }
    
    /**
     * Get fleet status
     */
    getStatus() {
        const status = {
            totalMeters: this.meters.size,
            producers: 0,
            consumers: 0,
            meters: []
        };
        
        for (const meter of this.meters.values()) {
            const info = meter.getInfo();
            status.meters.push(info);
            if (info.isProducer) status.producers++;
            else status.consumers++;
        }
        
        return status;
    }
}

// ============ DEMO EXECUTION ============

function runDemo() {
    console.log('\n' + '='.repeat(60));
    console.log('     NIT JALANDHAR SMART METER SIMULATOR - DEMO');
    console.log('='.repeat(60) + '\n');
    
    // Create meter fleet for NIT Jalandhar
    const fleet = new MeterFleet();
    
    // Add NIT Jalandhar campus meters
    // Solar installations
    fleet.addMeter(METER_TYPES.SOLAR_100KW, 'NITJ-SOLAR-MAIN');
    fleet.addMeter(METER_TYPES.SOLAR_75KW, 'NITJ-SOLAR-MEGA');
    fleet.addMeter(METER_TYPES.SOLAR_50KW, 'NITJ-SOLAR-LIBRARY');
    
    // Hostels
    fleet.addMeter(METER_TYPES.MEGA_HOSTEL, 'NITJ-MEGA-HOSTEL');
    fleet.addMeter(METER_TYPES.BOYS_HOSTEL, 'NITJ-BH1');
    fleet.addMeter(METER_TYPES.BOYS_HOSTEL, 'NITJ-BH2');
    fleet.addMeter(METER_TYPES.GIRLS_HOSTEL, 'NITJ-GH1');
    
    // Departments & Labs
    fleet.addMeter(METER_TYPES.DEPARTMENT, 'NITJ-CSE-DEPT');
    fleet.addMeter(METER_TYPES.LAB, 'NITJ-CCF');
    fleet.addMeter(METER_TYPES.LIBRARY, 'NITJ-LIBRARY');
    
    console.log('\n📊 NIT JALANDHAR CAMPUS METER FLEET:');
    console.log(JSON.stringify(fleet.getStatus(), null, 2));
    
    // Generate readings at different times
    console.log('\n\n📈 SAMPLE READINGS AT DIFFERENT TIMES (IST):\n');
    
    const testHours = [6, 10, 14, 19, 22]; // Morning, late morning, afternoon, evening, night
    
    for (const hour of testHours) {
        const testTime = new Date();
        testTime.setHours(hour, 0, 0, 0);
        
        console.log(`\n⏰ Time: ${testTime.toLocaleTimeString()} (${hour}:00 IST)`);
        console.log('-'.repeat(60));
        
        const readings = fleet.generateAllReadings(testTime.getTime());
        
        for (const reading of readings) {
            const icon = reading.isProducer ? '☀️' : '⚡';
            const tag = reading.carbonTag === 'GREEN' ? '🌱' : '🏭';
            console.log(`${icon} ${reading.meterId.padEnd(22)} | ${reading.kWh.toFixed(2).padStart(10)} kWh | ${tag} ${reading.carbonTag}`);
        }
    }
    
    // Show sample reading structure
    console.log('\n\n📋 SAMPLE READING STRUCTURE (JSON):');
    console.log('-'.repeat(50));
    const sampleMeter = fleet.getMeter('NITJ-SOLAR-MAIN');
    const sampleReading = sampleMeter.generateReading();
    console.log(JSON.stringify(sampleReading, null, 2));
    
    // Verify signature
    console.log('\n\n🔐 SIGNATURE VERIFICATION:');
    console.log('-'.repeat(50));
    const isValid = sampleMeter.verifyReading(sampleReading);
    console.log(`Reading signature valid: ${isValid ? '✅ YES' : '❌ NO'}`);
    
    // Tamper test
    const tamperedReading = { ...sampleReading, kWh: 999.999 };
    const isTamperedValid = sampleMeter.verifyReading(tamperedReading);
    console.log(`Tampered reading valid: ${isTamperedValid ? '✅ YES' : '❌ NO (ATTACK DETECTED!)'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('                    DEMO COMPLETE');
    console.log('         NIT Jalandhar Campus Energy System');
    console.log('='.repeat(60) + '\n');
}

// ============ EXPORTS ============

module.exports = {
    SmartMeter,
    MeterFleet,
    METER_TYPES,
    METER_CONFIGS,
    verifySignature,
    generateDataHash
};

// Run demo if executed directly
if (require.main === module) {
    runDemo();
}

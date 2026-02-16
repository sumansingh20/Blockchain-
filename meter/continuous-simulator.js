/**
 * ============================================
 * CONTINUOUS METER SIMULATOR
 * ============================================
 * Runs continuous meter simulation and sends
 * readings to the backend API
 */

const axios = require('axios');
const { MeterFleet, METER_TYPES } = require('./simulator');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS) || 10000; // 10 seconds default

// Create meter fleet
const fleet = new MeterFleet();

// Initialize meters
fleet.addMeter(METER_TYPES.SOLAR, 'SOLAR-MAIN-001');
fleet.addMeter(METER_TYPES.SOLAR, 'SOLAR-ROOF-002');
fleet.addMeter(METER_TYPES.HOSTEL, 'HOSTEL-BLOCK-A');
fleet.addMeter(METER_TYPES.HOSTEL, 'HOSTEL-BLOCK-B');
fleet.addMeter(METER_TYPES.LAB, 'LAB-COMPUTER-01');

console.log('\n🚀 CONTINUOUS METER SIMULATOR STARTED');
console.log(`📡 Sending readings to: ${API_URL}`);
console.log(`⏱️  Interval: ${INTERVAL_MS}ms`);
console.log('\nPress Ctrl+C to stop\n');
console.log('='.repeat(60) + '\n');

async function sendReading(reading) {
    try {
        const response = await axios.post(`${API_URL}/api/energy/record`, {
            meterId: reading.meterId,
            kWh: reading.kWh,
            timestamp: reading.timestamp,
            carbonTag: reading.carbonTag,
            type: reading.type,
            signature: reading.signature,
            dataHash: reading.dataHash,
            nonce: reading.nonce
        });
        
        const icon = reading.isProducer ? '☀️' : '⚡';
        const status = response.data.success ? '✅' : '❌';
        console.log(`${status} ${icon} ${reading.meterId} | ${reading.kWh.toFixed(3)} kWh | Receipt: ${response.data.receiptId || 'N/A'}`);
        
        return response.data;
    } catch (error) {
        console.error(`❌ Error sending ${reading.meterId}: ${error.message}`);
        return null;
    }
}

async function runCycle() {
    const timestamp = Date.now();
    const readings = fleet.generateAllReadings(timestamp);
    
    console.log(`\n[${new Date().toISOString()}] Generating ${readings.length} readings...`);
    
    for (const reading of readings) {
        await sendReading(reading);
    }
}

// Initial run
runCycle();

// Continuous runs
setInterval(runCycle, INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Simulator stopped');
    process.exit(0);
});

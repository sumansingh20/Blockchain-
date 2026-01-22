/**
 * ============================================
 * NIT JALANDHAR - CAMPUS ENERGY TRADE DEMO
 * ============================================
 * Complete demonstration of the tokenized energy
 * trading system with blockchain provenance and
 * CBDC (e₹) settlement for NIT Jalandhar campus.
 * 
 * Location: NIT Jalandhar, GT Road, Jalandhar, Punjab 144027
 */

const axios = require('axios');
const { MeterFleet, METER_TYPES } = require('../meter/simulator');

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Create NIT Jalandhar campus meter fleet
const fleet = new MeterFleet();

// ========== INITIALIZE NIT JALANDHAR METERS ==========

// Solar Installations (250 kW total rooftop solar)
fleet.addMeter(METER_TYPES.SOLAR_100KW, 'NITJ-SOLAR-MAIN');       // Main Building 100 kW
fleet.addMeter(METER_TYPES.SOLAR_75KW, 'NITJ-SOLAR-MEGA');        // Mega Hostel 75 kW
fleet.addMeter(METER_TYPES.SOLAR_50KW, 'NITJ-SOLAR-LIBRARY');     // Library 50 kW

// Boys Hostels
fleet.addMeter(METER_TYPES.MEGA_HOSTEL, 'NITJ-MEGA-HOSTEL');      // Mega Hostel (~1500 students)
fleet.addMeter(METER_TYPES.BOYS_HOSTEL, 'NITJ-BH1');              // Boys Hostel 1
fleet.addMeter(METER_TYPES.BOYS_HOSTEL, 'NITJ-BH2');              // Boys Hostel 2
fleet.addMeter(METER_TYPES.BOYS_HOSTEL, 'NITJ-BH3');              // Boys Hostel 3
fleet.addMeter(METER_TYPES.BOYS_HOSTEL, 'NITJ-BH4');              // Boys Hostel 4

// Girls Hostels
fleet.addMeter(METER_TYPES.GIRLS_HOSTEL, 'NITJ-GH1');             // Girls Hostel 1
fleet.addMeter(METER_TYPES.GIRLS_HOSTEL, 'NITJ-GH2');             // Girls Hostel 2 (New)

// Academic Departments
fleet.addMeter(METER_TYPES.DEPARTMENT, 'NITJ-CSE-DEPT');          // Computer Science & Engineering
fleet.addMeter(METER_TYPES.DEPARTMENT, 'NITJ-ECE-DEPT');          // Electronics & Communication
fleet.addMeter(METER_TYPES.DEPARTMENT, 'NITJ-ME-DEPT');           // Mechanical Engineering

// Labs and Facilities
fleet.addMeter(METER_TYPES.LAB, 'NITJ-CCF');                      // Central Computing Facility
fleet.addMeter(METER_TYPES.LAB, 'NITJ-WORKSHOP');                 // Central Workshop
fleet.addMeter(METER_TYPES.LIBRARY, 'NITJ-LIBRARY');              // Central Library
fleet.addMeter(METER_TYPES.ADMIN, 'NITJ-ADMIN');                  // Administrative Block

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendReading(reading) {
    try {
        const response = await axios.post(`${API_URL}/api/energy/record`, {
            meterId: reading.meterId,
            kWh: reading.kWh,
            kWhScaled: reading.kWhScaled,
            timestamp: reading.timestamp,
            carbonTag: reading.carbonTag,
            type: reading.type,
            signature: reading.signature,
            dataHash: reading.dataHash,
            nonce: reading.nonce
        });
        
        return response.data;
    } catch (error) {
        console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
        return null;
    }
}

async function runDemo() {
    console.log('\n' + '═'.repeat(80));
    console.log('     🏛️  NIT JALANDHAR - TOKENIZED CAMPUS ENERGY TRADE SYSTEM');
    console.log('          Blockchain Provenance & CBDC (e₹) Settlement');
    console.log('═'.repeat(80) + '\n');
    
    console.log('📍 Location: NIT Jalandhar, GT Road Bypass, Jalandhar, Punjab 144027');
    console.log('⚡ PSPCL Consumer: Large Supply (LS) Category | 2500 kVA Sanctioned Load');
    console.log('📅 Demo Date:', new Date().toLocaleDateString('en-IN', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }));
    
    console.log('\n📋 ENERGY TRADE FLOW:');
    console.log('   1️⃣  Smart meters record energy production/consumption');
    console.log('   2️⃣  Data validated & signed (tamper-proof)');
    console.log('   3️⃣  Blockchain receipt created (Ethereum/Polygon)');
    console.log('   4️⃣  Energy token minted (1 Token = 1 kWh)');
    console.log('   5️⃣  PSPCL tariff calculated (₹6.79/kWh base + ToU)');
    console.log('   6️⃣  CBDC (e₹) settlement via RBI Digital Rupee');
    console.log('   7️⃣  Settlement recorded on blockchain');
    
    console.log('\n' + '─'.repeat(80) + '\n');
    
    // Check API health
    console.log('🔍 Checking NIT Jalandhar Energy System health...');
    try {
        const health = await axios.get(`${API_URL}/api/health`);
        if (health.data.blockchain !== 'connected') {
            console.log('❌ Blockchain not connected!');
            console.log('   Please ensure Hardhat node is running: npx hardhat node');
            console.log('   And contract is deployed: npm run deploy');
            process.exit(1);
        }
        console.log('✅ System healthy - Blockchain connected\n');
    } catch (error) {
        console.log('❌ API not reachable!');
        console.log('   Please start the server: npm run server');
        process.exit(1);
    }
    
    // ========== NIT JALANDHAR DEMO SCENARIOS ==========
    const scenarios = [
        {
            name: '☀️ Morning Solar Generation (10 AM)',
            description: 'Rooftop solar panels generating clean energy - 250 kW total capacity',
            hour: 10,
            meters: ['NITJ-SOLAR-MAIN', 'NITJ-SOLAR-MEGA', 'NITJ-SOLAR-LIBRARY']
        },
        {
            name: '🏢 Academic Hours - Department Load (11 AM)',
            description: 'Classes in session - CSE, ECE departments and CCF lab active',
            hour: 11,
            meters: ['NITJ-CSE-DEPT', 'NITJ-ECE-DEPT', 'NITJ-CCF']
        },
        {
            name: '📚 Library & Workshop Peak Usage (3 PM)',
            description: 'Students studying, practical sessions in Central Workshop',
            hour: 15,
            meters: ['NITJ-LIBRARY', 'NITJ-WORKSHOP', 'NITJ-ADMIN']
        },
        {
            name: '🔴 PSPCL PEAK HOURS - Evening Hostel Load (7 PM)',
            description: '⚠️ Maximum tariff period (1.2x) - Students in hostels, ACs running',
            hour: 19,
            meters: ['NITJ-MEGA-HOSTEL', 'NITJ-BH1', 'NITJ-BH2', 'NITJ-GH1', 'NITJ-GH2']
        },
        {
            name: '🌙 Night Rebate Period - Late Study (11 PM)',
            description: '💚 Reduced tariff (0.9x) - End-semester exam preparation',
            hour: 23,
            meters: ['NITJ-MEGA-HOSTEL', 'NITJ-LIBRARY', 'NITJ-BH3', 'NITJ-BH4']
        }
    ];
    
    let totalStats = {
        produced: 0,
        consumed: 0,
        greenEnergy: 0,
        totalSettled: 0,
        transactions: 0
    };
    
    for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        
        console.log(`\n📌 SCENARIO ${i + 1}: ${scenario.name}`);
        console.log(`   ${scenario.description}`);
        console.log('─'.repeat(70));
        
        // Use yesterday's date with the specified hour to avoid future timestamp issues
        const testTime = new Date();
        testTime.setDate(testTime.getDate() - 1); // Yesterday
        testTime.setHours(scenario.hour, 0, 0, 0);
        
        for (const meterId of scenario.meters) {
            const meter = fleet.getMeter(meterId);
            if (!meter) {
                console.log(`   ⚠️ Meter ${meterId} not found`);
                continue;
            }
            
            const reading = meter.generateReading(testTime.getTime());
            
            const icon = reading.isProducer ? '☀️' : '⚡';
            const carbonIcon = reading.carbonTag === 'GREEN' ? '🌱 GREEN (Solar)' : '🏭 GRID';
            console.log(`\n   ${icon} ${meterId}`);
            console.log(`      Energy: ${reading.kWh.toFixed(2)} kWh | Carbon: ${carbonIcon}`);
            
            const result = await sendReading(reading);
            
            if (result && result.success) {
                console.log(`      ✅ Blockchain Receipt #${result.receiptId} | Token #${result.tokenId}`);
                console.log(`      💰 Amount: ${result.pricing.finalAmountINR} (PSPCL ${result.pricing.breakdown.timeOfUse.category})`);
                console.log(`         Base Rate: ₹${(result.pricing.breakdown.baseRatePerKWh / 100).toFixed(2)}/kWh × ${result.pricing.breakdown.timeOfUse.multiplier}x`);
                
                if (result.pricing.breakdown.carbonDiscount && result.pricing.breakdown.carbonDiscount.discount > 0) {
                    console.log(`         🌱 Solar Incentive: -${result.pricing.breakdown.discountAmountINR}`);
                }
                
                if (result.settlement && result.settlement.success) {
                    console.log(`      💳 CBDC: ${result.settlement.from} → ${result.settlement.to}`);
                    console.log(`         Ref: ${result.settlement.paymentRef}`);
                }
                
                console.log(`      🔗 TX: ${result.blockchain.receiptTx.slice(0, 42)}...`);
                
                // Update stats
                if (reading.isProducer) {
                    totalStats.produced += reading.kWh;
                    totalStats.greenEnergy += reading.kWh;
                } else {
                    totalStats.consumed += reading.kWh;
                }
                totalStats.totalSettled += result.pricing.finalAmount / 100;
                totalStats.transactions++;
            }
            
            await sleep(800);
        }
    }
    
    // ========== FINAL SUMMARY ==========
    console.log('\n\n' + '═'.repeat(80));
    console.log('     📊 NIT JALANDHAR - CAMPUS ENERGY TRADE SUMMARY');
    console.log('═'.repeat(80) + '\n');
    
    try {
        const summary = await axios.get(`${API_URL}/api/dashboard/summary`);
        const data = summary.data.summary || summary.data;
        
        console.log('   ⚡ ENERGY STATISTICS:');
        console.log(`      Solar Generated:     ${totalStats.produced.toFixed(2)} kWh (GREEN)`);
        console.log(`      Grid Consumed:       ${totalStats.consumed.toFixed(2)} kWh`);
        console.log(`      Net Energy:          ${(totalStats.produced - totalStats.consumed).toFixed(2)} kWh`);
        const greenPct = totalStats.produced + totalStats.consumed > 0 
            ? ((totalStats.greenEnergy / (totalStats.produced + totalStats.consumed)) * 100).toFixed(1) 
            : '0.0';
        console.log(`      Green Percentage:    ${greenPct}%`);
        
        console.log('\n   🔗 BLOCKCHAIN RECORDS:');
        console.log(`      Total Receipts:      ${data.blockchain?.totalReceipts || totalStats.transactions}`);
        console.log(`      Tokens Minted:       ${data.blockchain?.totalTokens || totalStats.transactions}`);
        console.log(`      Settlements:         ${data.blockchain?.totalSettlements || totalStats.transactions}`);
        
        console.log('\n   💰 CBDC (e₹) SETTLEMENT:');
        console.log(`      Total Settled:       ₹${totalStats.totalSettled.toFixed(2)}`);
        console.log(`      PSPCL Base Rate:     ₹6.79/kWh (LS Category)`);
        console.log(`      Peak Multiplier:     1.2x (6PM-10PM)`);
        console.log(`      Night Rebate:        0.9x (10PM-6AM)`);
        
        if (data.cbdc && data.cbdc.totalWallets) {
            console.log(`\n   🏦 NIT JALANDHAR WALLETS: ${data.cbdc.totalWallets}`);
        }
        
    } catch (error) {
        console.log('   (Could not fetch detailed summary)');
        console.log(`   Total Transactions: ${totalStats.transactions}`);
        console.log(`   Total Settled: ₹${totalStats.totalSettled.toFixed(2)}`);
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('     🎉 DEMO COMPLETE - NIT JALANDHAR CAMPUS ENERGY SYSTEM');
    console.log('═'.repeat(80));
    console.log('\n   🌐 Dashboard: http://localhost:3000');
    console.log('   📡 API Health: http://localhost:3000/api/health');
    console.log('   📊 Summary: http://localhost:3000/api/dashboard/summary\n');
}

runDemo().catch(console.error);

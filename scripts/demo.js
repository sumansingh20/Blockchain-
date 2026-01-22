/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * Demo Script - Complete Transaction Flow
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 * 
 * @usage node scripts/demo.js
 */

'use strict';

const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const DELAY_MS = 800;

// NIT Jalandhar Campus Demo Scenarios
const DEMO_SCENARIOS = [
    // Morning Academic Activity
    {
        name: 'Main Building - Morning Classes',
        meterId: 'NITJ-MB1-004',
        kWh: 15.5,
        carbonTag: 'GREEN',
        payerWallet: 'NITJ_ACADEMIC'
    },
    {
        name: 'Lecture Hall Complex',
        meterId: 'NITJ-LH1-005',
        kWh: 12.3,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_ACADEMIC'
    },
    {
        name: 'Computer Science Block - Lab Sessions',
        meterId: 'NITJ-CS1-006',
        kWh: 18.7,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_ACADEMIC'
    },
    
    // Hostel Complex
    {
        name: 'Mega Hostel Block-1',
        meterId: 'NITJ-MH1-001',
        kWh: 25.2,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_HOSTELS'
    },
    {
        name: 'Mega Hostel Block-2',
        meterId: 'NITJ-MH2-002',
        kWh: 23.8,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_HOSTELS'
    },
    {
        name: 'Girls Hostel Block-1',
        meterId: 'NITJ-GH1-003',
        kWh: 18.5,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_HOSTELS'
    },
    
    // Green Energy Buildings
    {
        name: 'Central Library (Solar)',
        meterId: 'NITJ-LIB-010',
        kWh: 8.9,
        carbonTag: 'RENEWABLE',
        payerWallet: 'NITJ_LIBRARY'
    },
    {
        name: 'Administrative Block (Solar)',
        meterId: 'NITJ-ADM-009',
        kWh: 10.2,
        carbonTag: 'GREEN',
        payerWallet: 'NITJ_ADMIN'
    },
    {
        name: 'TBI Research Center',
        meterId: 'NITJ-TBI-013',
        kWh: 7.5,
        carbonTag: 'GREEN',
        payerWallet: 'NITJ_ACADEMIC'
    },
    
    // Heavy Load Centers
    {
        name: 'Central Workshop',
        meterId: 'NITJ-WKS-012',
        kWh: 45.6,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_WORKSHOP'
    },
    {
        name: 'Mechanical Engineering - CNC Lab',
        meterId: 'NITJ-ME1-008',
        kWh: 32.4,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_ACADEMIC'
    },
    {
        name: 'ECE Department - Research Labs',
        meterId: 'NITJ-ECE-007',
        kWh: 22.1,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_ACADEMIC'
    },
    
    // Amenities & Sports
    {
        name: 'Sports Complex - Floodlights',
        meterId: 'NITJ-SPT-011',
        kWh: 28.5,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_SPORTS'
    },
    {
        name: 'Central Cafeteria',
        meterId: 'NITJ-CAF-015',
        kWh: 15.8,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_MAIN'
    },
    
    // Evening Peak
    {
        name: 'Mega Hostel Block-1 (Evening Peak)',
        meterId: 'NITJ-MH1-001',
        kWh: 35.2,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_HOSTELS'
    },
    {
        name: 'Mega Hostel Block-2 (Evening Peak)',
        meterId: 'NITJ-MH2-002',
        kWh: 33.1,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_HOSTELS'
    },
    
    // Faculty Housing
    {
        name: 'Faculty Housing Type-A',
        meterId: 'NITJ-FH1-014',
        kWh: 12.4,
        carbonTag: 'NORMAL',
        payerWallet: 'NITJ_MAIN'
    },
    
    // Night Library
    {
        name: 'Central Library (Night Study)',
        meterId: 'NITJ-LIB-010',
        kWh: 5.2,
        carbonTag: 'RENEWABLE',
        payerWallet: 'NITJ_LIBRARY'
    }
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

class DemoRunner {
    constructor() {
        this.results = {
            successful: 0,
            failed: 0,
            totalKwh: 0,
            totalAmount: 0,
            transactions: []
        };
    }

    async run() {
        this.printHeader();
        
        // Check server health
        const isHealthy = await this.checkHealth();
        if (!isHealthy) {
            console.log('\n❌ Server not available. Please ensure:');
            console.log('   1. Hardhat node is running: npx hardhat node');
            console.log('   2. Contract is deployed: npx hardhat run scripts/deploy.js --network localhost');
            console.log('   3. Server is running: node backend/server.js');
            process.exit(1);
        }
        
        console.log('\n✅ Server connected. Starting demo...\n');
        console.log('═'.repeat(80));
        
        // Run each scenario
        for (let i = 0; i < DEMO_SCENARIOS.length; i++) {
            const scenario = DEMO_SCENARIOS[i];
            await this.executeScenario(i + 1, scenario);
            await this.sleep(DELAY_MS);
        }
        
        // Print summary
        this.printSummary();
        
        // Print wallet balances
        await this.printWalletBalances();
        
        // Print blockchain statistics
        await this.printBlockchainStats();
    }

    async checkHealth() {
        try {
            const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
            return response.data.status === 'healthy';
        } catch {
            return false;
        }
    }

    async executeScenario(index, scenario) {
        const padIndex = String(index).padStart(2, '0');
        
        try {
            const response = await axios.post(`${API_URL}/transaction/complete`, {
                meterId: scenario.meterId,
                kWh: scenario.kWh,
                carbonTag: scenario.carbonTag,
                payerWallet: scenario.payerWallet,
                payeeWallet: 'PSPCL_GRID'
            });
            
            const data = response.data.data;
            
            console.log(`[${padIndex}] ✅ ${scenario.name}`);
            console.log(`    Meter: ${scenario.meterId} | ${scenario.kWh} kWh | ${scenario.carbonTag}`);
            console.log(`    Receipt #${data.receipt.receiptId} → Token #${data.token.tokenId} → Settlement #${data.settlement.settlementId}`);
            console.log(`    Amount: ₹${data.pricing.total.toFixed(2)} (${data.pricing.period} rate)`);
            console.log(`    CBDC: ${scenario.payerWallet} → PSPCL_GRID [${data.transfer.referenceId}]`);
            console.log('');
            
            this.results.successful++;
            this.results.totalKwh += scenario.kWh;
            this.results.totalAmount += data.pricing.total;
            this.results.transactions.push({
                ...scenario,
                receiptId: data.receipt.receiptId,
                tokenId: data.token.tokenId,
                settlementId: data.settlement.settlementId,
                amount: data.pricing.total
            });
            
        } catch (error) {
            console.log(`[${padIndex}] ❌ ${scenario.name}`);
            console.log(`    Error: ${error.response?.data?.error || error.message}`);
            console.log('');
            
            this.results.failed++;
        }
    }

    printHeader() {
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                                                                               ║');
        console.log('║   ███╗   ██╗██╗████████╗     ██╗ █████╗ ██╗      █████╗ ███╗   ██╗██████╗    ║');
        console.log('║   ████╗  ██║██║╚══██╔══╝     ██║██╔══██╗██║     ██╔══██╗████╗  ██║██╔══██╗   ║');
        console.log('║   ██╔██╗ ██║██║   ██║        ██║███████║██║     ███████║██╔██╗ ██║██║  ██║   ║');
        console.log('║   ██║╚██╗██║██║   ██║   ██   ██║██╔══██║██║     ██╔══██║██║╚██╗██║██║  ██║   ║');
        console.log('║   ██║ ╚████║██║   ██║   ╚█████╔╝██║  ██║███████╗██║  ██║██║ ╚████║██████╔╝   ║');
        console.log('║   ╚═╝  ╚═══╝╚═╝   ╚═╝    ╚════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝    ║');
        console.log('║                                                                               ║');
        console.log('║           CAMPUS ENERGY TRADE SYSTEM - BLOCKCHAIN DEMO v2.0                   ║');
        console.log('║                    Dr B R Ambedkar NIT Jalandhar                              ║');
        console.log('║                                                                               ║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
        console.log(`\n📅 Demo Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`📡 API Endpoint: ${API_URL}`);
        console.log(`📊 Scenarios: ${DEMO_SCENARIOS.length}`);
    }

    printSummary() {
        console.log('═'.repeat(80));
        console.log('\n📊 DEMO SUMMARY');
        console.log('─'.repeat(40));
        console.log(`   Total Transactions: ${this.results.successful + this.results.failed}`);
        console.log(`   Successful: ${this.results.successful}`);
        console.log(`   Failed: ${this.results.failed}`);
        console.log(`   Total Energy: ${this.results.totalKwh.toFixed(3)} kWh`);
        console.log(`   Total Amount: ₹${this.results.totalAmount.toFixed(2)}`);
        console.log(`   Avg Rate: ₹${(this.results.totalAmount / this.results.totalKwh).toFixed(2)}/kWh`);
        console.log('─'.repeat(40));
        
        // Carbon breakdown
        const greenTx = this.results.transactions.filter(t => t.carbonTag === 'GREEN');
        const renewableTx = this.results.transactions.filter(t => t.carbonTag === 'RENEWABLE');
        const normalTx = this.results.transactions.filter(t => t.carbonTag === 'NORMAL');
        
        console.log('\n🌱 Carbon Tag Distribution:');
        console.log(`   GREEN:     ${greenTx.length} transactions (${greenTx.reduce((s,t) => s+t.kWh, 0).toFixed(2)} kWh)`);
        console.log(`   RENEWABLE: ${renewableTx.length} transactions (${renewableTx.reduce((s,t) => s+t.kWh, 0).toFixed(2)} kWh)`);
        console.log(`   NORMAL:    ${normalTx.length} transactions (${normalTx.reduce((s,t) => s+t.kWh, 0).toFixed(2)} kWh)`);
    }

    async printWalletBalances() {
        try {
            const response = await axios.get(`${API_URL}/wallet/all`);
            const wallets = response.data.data;
            
            console.log('\n💰 CBDC WALLET BALANCES');
            console.log('─'.repeat(50));
            
            for (const [id, info] of Object.entries(wallets)) {
                const balance = info.balance.toLocaleString('en-IN', { 
                    minimumFractionDigits: 2 
                });
                console.log(`   ${id.padEnd(20)} ₹${balance.padStart(15)}`);
            }
        } catch (error) {
            console.log('\n⚠️ Could not fetch wallet balances');
        }
    }

    async printBlockchainStats() {
        try {
            const response = await axios.get(`${API_URL}/statistics`);
            const stats = response.data.data;
            
            console.log('\n⛓️ BLOCKCHAIN STATISTICS');
            console.log('─'.repeat(40));
            console.log(`   Receipts on Chain:  ${stats.blockchain.receipts}`);
            console.log(`   Tokens Minted:      ${stats.blockchain.tokens}`);
            console.log(`   Settlements:        ${stats.blockchain.settlements}`);
            console.log(`   Total Energy:       ${stats.blockchain.totalEnergy.toFixed(3)} kWh`);
            console.log(`   Green Energy:       ${stats.blockchain.greenEnergy.toFixed(3)} kWh`);
            console.log(`   Settlement Value:   ₹${stats.blockchain.settlementValue.toFixed(2)}`);
            
            console.log('\n💳 CBDC STATISTICS');
            console.log('─'.repeat(40));
            console.log(`   Total Transactions: ${stats.cbdc.totalTransactions}`);
            console.log(`   Total Volume:       ₹${stats.cbdc.totalVolume.toFixed(2)}`);
            console.log(`   Grid Payments:      ₹${stats.cbdc.gridPayments.toFixed(2)}`);
            
        } catch (error) {
            console.log('\n⚠️ Could not fetch blockchain statistics');
        }
        
        console.log('\n' + '═'.repeat(80));
        console.log('🎉 DEMO COMPLETED SUCCESSFULLY!');
        console.log('═'.repeat(80));
        console.log(`
📌 What was demonstrated:
   ✓ Energy receipt recording on blockchain
   ✓ Token minting for energy certificates
   ✓ PSPCL tariff calculation with time-of-use rates
   ✓ CBDC (e₹) instant settlements
   ✓ Multi-zone campus energy tracking
   ✓ Green energy tag support

🔗 Dashboard: http://localhost:3000/
📖 API Docs: http://localhost:3000/api/health
        `);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════════════════════════

const demo = new DemoRunner();
demo.run().catch(console.error);

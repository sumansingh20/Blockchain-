/**
 * Show All Real Blockchain Data - NIT Jalandhar Campus Energy
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const carbonTags = ['NORMAL', 'GREEN', 'RENEWABLE', 'CERTIFIED'];
const statusTypes = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'];

async function main() {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const deployedPath = path.join(__dirname, '../deployedAddress.json');
    const artifactPath = path.join(__dirname, '../artifacts/contracts/EnergyLedger.sol/EnergyLedger.json');
    
    const deployed = JSON.parse(fs.readFileSync(deployedPath));
    const artifact = JSON.parse(fs.readFileSync(artifactPath));
    const contract = new ethers.Contract(deployed.address, artifact.abi, provider);

    console.log('\n' + '═'.repeat(80));
    console.log('  ⛓️  NIT JALANDHAR - REAL BLOCKCHAIN DATA');
    console.log('═'.repeat(80));

    // Contract Info
    console.log('\n📋 SMART CONTRACT INFORMATION:');
    console.log('─'.repeat(50));
    console.log(`   Contract Address: ${deployed.address}`);
    console.log(`   Network:          ${deployed.network}`);
    console.log(`   Chain ID:         ${deployed.chainId}`);
    console.log(`   Version:          ${await contract.VERSION()}`);
    console.log(`   Institution:      ${await contract.INSTITUTION()}`);
    console.log(`   Deployed At:      ${deployed.deployedAt}`);

    // Statistics
    const stats = await contract.getStatistics();
    const receipts = Number(stats[0]);
    const tokens = Number(stats[1]);
    const settlements = Number(stats[2]);
    const totalEnergy = Number(stats[3]) / 1000;
    const greenEnergy = Number(stats[4]) / 1000;
    const settlementValue = Number(stats[5]) / 100;

    console.log('\n📊 BLOCKCHAIN STATISTICS:');
    console.log('─'.repeat(50));
    console.log(`   Total Receipts:      ${receipts}`);
    console.log(`   Total Tokens:        ${tokens}`);
    console.log(`   Total Settlements:   ${settlements}`);
    console.log(`   Total Energy:        ${totalEnergy.toFixed(3)} kWh`);
    console.log(`   Green Energy:        ${greenEnergy.toFixed(3)} kWh (${((greenEnergy/totalEnergy)*100).toFixed(1)}%)`);
    console.log(`   Settlement Value:    ₹${settlementValue.toLocaleString('en-IN')}`);

    // All Receipts
    console.log('\n' + '═'.repeat(80));
    console.log('  📜 ALL ENERGY RECEIPTS ON BLOCKCHAIN');
    console.log('═'.repeat(80));

    for (let i = 1; i <= receipts; i++) {
        const r = await contract.getReceipt(i);
        const kWh = Number(r.kWhScaled) / 1000;
        const tag = carbonTags[Number(r.carbonTag)];
        const icon = tag === 'GREEN' ? '🌿' : tag === 'RENEWABLE' ? '☀️' : '⚡';
        
        console.log(`\n${icon} Receipt #${i}: ${r.meterId}`);
        console.log('─'.repeat(50));
        console.log(`   Energy:      ${kWh.toFixed(3)} kWh`);
        console.log(`   Carbon Tag:  ${tag}`);
        console.log(`   Timestamp:   ${new Date(Number(r.timestamp)).toLocaleString('en-IN')}`);
        console.log(`   Data Hash:   ${r.dataHash}`);
        console.log(`   Valid:       ${r.isValid ? '✅ YES' : '❌ NO'}`);
    }

    // Wallet Balances from API
    console.log('\n' + '═'.repeat(80));
    console.log('  💰 CBDC (e₹) WALLET BALANCES');
    console.log('═'.repeat(80));
    
    try {
        const response = await fetch('http://localhost:3000/api/wallet/all');
        const data = await response.json();
        if (data.success) {
            console.log('');
            for (const [id, info] of Object.entries(data.data)) {
                const icon = id.includes('PSPCL') ? '⚡' : id.includes('RBI') ? '🏦' : '🏛️';
                console.log(`   ${icon} ${id.padEnd(20)} ₹${info.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
            }
        }
    } catch (e) {
        console.log('   (Server not available for wallet data)');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('  ✅ ALL DATA IS STORED IMMUTABLY ON ETHEREUM BLOCKCHAIN');
    console.log('═'.repeat(80) + '\n');
}

main().catch(console.error);

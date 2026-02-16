/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM
 * Hardhat Deployment Script
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author NIT Jalandhar Energy Team
 * @version 2.0.0
 * @license MIT
 * 
 * @usage npx hardhat run scripts/deploy.js --network localhost
 */

'use strict';

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOYMENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    contractName: 'EnergyLedger',
    outputPath: path.join(__dirname, '../deployedAddress.json'),
    verifyOnEtherscan: false
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║     NIT JALANDHAR - ENERGY LEDGER DEPLOYMENT                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    // Get deployment account
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    
    console.log('📋 Deployment Configuration:');
    console.log('─'.repeat(50));
    console.log(`   Network:    ${hre.network.name}`);
    console.log(`   Chain ID:   ${(await hre.ethers.provider.getNetwork()).chainId}`);
    console.log(`   Deployer:   ${deployer.address}`);
    console.log(`   Balance:    ${hre.ethers.formatEther(balance)} ETH`);
    console.log('─'.repeat(50));

    // Compile contracts
    console.log('\n⚙️  Compiling contracts...');
    await hre.run('compile');
    console.log('   ✅ Compilation successful');

    // Deploy contract
    console.log('\n🚀 Deploying EnergyLedger contract...');
    
    const EnergyLedger = await hre.ethers.getContractFactory(CONFIG.contractName);
    const energyLedger = await EnergyLedger.deploy();
    
    await energyLedger.waitForDeployment();
    
    const contractAddress = await energyLedger.getAddress();
    const deployTx = energyLedger.deploymentTransaction();
    
    console.log('\n✅ Deployment Successful!');
    console.log('─'.repeat(50));
    console.log(`   Contract:   ${CONFIG.contractName}`);
    console.log(`   Address:    ${contractAddress}`);
    console.log(`   TX Hash:    ${deployTx.hash}`);
    console.log(`   Block:      ${deployTx.blockNumber || 'pending'}`);
    console.log(`   Gas Used:   ${deployTx.gasLimit?.toString() || 'N/A'}`);
    console.log('─'.repeat(50));

    // Verify contract state
    console.log('\n🔍 Verifying contract state...');
    
    const version = await energyLedger.VERSION();
    const institution = await energyLedger.INSTITUTION();
    const owner = await energyLedger.owner();
    const isAuthorized = await energyLedger.isAuthorizedRegistrar(deployer.address);
    
    console.log(`   Version:      ${version}`);
    console.log(`   Institution:  ${institution}`);
    console.log(`   Owner:        ${owner}`);
    console.log(`   Authorized:   ${isAuthorized ? 'Yes' : 'No'}`);

    // Save deployment info
    const deploymentInfo = {
        contract: CONFIG.contractName,
        address: contractAddress,
        network: hre.network.name,
        chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        transactionHash: deployTx.hash,
        version: version,
        institution: institution
    };
    
    fs.writeFileSync(
        CONFIG.outputPath,
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`\n💾 Deployment info saved to: ${CONFIG.outputPath}`);

    // Verify on Etherscan (if configured)
    if (CONFIG.verifyOnEtherscan && hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
        console.log('\n📝 Verifying on Etherscan...');
        try {
            await hre.run('verify:verify', {
                address: contractAddress,
                constructorArguments: []
            });
            console.log('   ✅ Verification successful');
        } catch (error) {
            console.log(`   ⚠️ Verification failed: ${error.message}`);
        }
    }

    // Summary
    console.log('\n═'.repeat(60));
    console.log('🎉 DEPLOYMENT COMPLETE');
    console.log('═'.repeat(60));
    console.log(`
Next Steps:
  1. Start the backend server:
     cd backend && node server.js

  2. Run demo simulation:
     node meter/simulator.js --demo

  3. Open dashboard:
     http://localhost:3000/

Contract Address: ${contractAddress}
`);

    return { address: contractAddress, deployer: deployer.address };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════════════════════════

main()
    .then((result) => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Deployment failed:');
        console.error(error);
        process.exit(1);
    });

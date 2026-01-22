/**
 * ============================================
 * HARDHAT DEPLOYMENT SCRIPT
 * ============================================
 * Deploys the EnergyLedger contract to local network
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("       DEPLOYING ENERGY LEDGER CONTRACT");
    console.log("=".repeat(60) + "\n");
    
    // Get deployer account
    let deployer;
    try {
        [deployer] = await hre.ethers.getSigners();
    } catch (error) {
        console.error("❌ Cannot connect to network.");
        console.log("\n📋 To deploy, run these commands in separate terminals:\n");
        console.log("   Terminal 1: cd campus-energy && npx hardhat node");
        console.log("   Terminal 2: cd campus-energy && npx hardhat run scripts/deploy.js --network localhost\n");
        throw error;
    }
    console.log("📍 Deploying with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");
    
    // Deploy contract
    console.log("🔨 Compiling and deploying EnergyLedger...\n");
    
    const EnergyLedger = await hre.ethers.getContractFactory("EnergyLedger");
    const energyLedger = await EnergyLedger.deploy();
    
    await energyLedger.waitForDeployment();
    
    const contractAddress = await energyLedger.getAddress();
    
    console.log("✅ EnergyLedger deployed to:", contractAddress);
    console.log("📝 Owner address:", await energyLedger.owner());
    
    // Save deployment info
    const deploymentInfo = {
        contractName: "EnergyLedger",
        contractAddress: contractAddress,
        deployerAddress: deployer.address,
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        deployedAt: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };
    
    // Save to deployment file
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📁 Deployment info saved to:", deploymentPath);
    
    // Update .env file with contract address
    const envPath = path.join(__dirname, "..", ".env");
    const envExamplePath = path.join(__dirname, "..", ".env.example");
    
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
    }
    
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        envContent = envContent.replace(
            /CONTRACT_ADDRESS=.*/,
            `CONTRACT_ADDRESS=${contractAddress}`
        );
        fs.writeFileSync(envPath, envContent);
        console.log("📝 Updated .env with contract address");
    }
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const stats = await energyLedger.getStats();
    console.log("   Total Receipts:", stats[0].toString());
    console.log("   Total Tokens:", stats[1].toString());
    console.log("   Total Settlements:", stats[2].toString());
    
    console.log("\n" + "=".repeat(60));
    console.log("       DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n🚀 Next steps:");
    console.log("   1. Start the backend server: npm run server");
    console.log("   2. Run the meter simulator: npm run meter");
    console.log("   3. Open the dashboard: frontend/index.html\n");
    
    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });

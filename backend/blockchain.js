/**
 * ============================================
 * BLOCKCHAIN SERVICE
 * ============================================
 * Handles all interactions with the EnergyLedger
 * smart contract using ethers.js
 */

const { ethers, NonceManager } = require('ethers');
const fs = require('fs');
const path = require('path');

class BlockchainService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.nonceSigner = null;  // NonceManager wrapped signer
        this.contract = null;
        this.isConnected = false;
    }
    
    /**
     * Initialize connection to blockchain
     */
    async initialize() {
        try {
            console.log('🔗 Connecting to blockchain...');
            
            // Connect to local Hardhat network
            const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            
            // Get signer (deployer account)
            const privateKey = process.env.DEPLOYER_PRIVATE_KEY || 
                '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
            this.signer = new ethers.Wallet(privateKey, this.provider);
            
            // Wrap with NonceManager for automatic nonce handling
            this.nonceSigner = new NonceManager(this.signer);
            
            // Load contract ABI
            const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 
                'EnergyLedger.sol', 'EnergyLedger.json');
            
            if (!fs.existsSync(artifactPath)) {
                throw new Error('Contract artifact not found. Run: npm run compile');
            }
            
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            
            // Get contract address
            let contractAddress = process.env.CONTRACT_ADDRESS;
            
            if (!contractAddress || contractAddress === '<deployed_contract_address>') {
                // Try to load from deployment file
                const deploymentPath = path.join(__dirname, '..', 'deployments', 'localhost.json');
                if (fs.existsSync(deploymentPath)) {
                    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
                    contractAddress = deployment.contractAddress;
                }
            }
            
            if (!contractAddress) {
                throw new Error('Contract address not found. Run: npm run deploy');
            }
            
            // Create contract instance with NonceManager signer
            this.contract = new ethers.Contract(
                contractAddress,
                artifact.abi,
                this.nonceSigner
            );
            
            // Verify connection
            const owner = await this.contract.owner();
            console.log('✅ Connected to EnergyLedger contract');
            console.log('   Contract:', contractAddress);
            console.log('   Owner:', owner);
            console.log('   Signer:', this.signer.address);
            
            this.isConnected = true;
            return true;
            
        } catch (error) {
            console.error('❌ Blockchain connection failed:', error.message);
            this.isConnected = false;
            throw error;
        }
    }
    
    /**
     * Record energy data on blockchain
     */
    async recordEnergy(meterId, kWhScaled, timestamp, carbonTag, dataHash) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        try {
            // Convert carbon tag to number (0 = NORMAL, 1 = GREEN)
            const carbonTagNum = carbonTag === 'GREEN' ? 1 : 0;
            
            console.log(`📝 Recording energy: ${meterId}, ${kWhScaled} (scaled kWh), ${carbonTag}`);
            
            const tx = await this.contract.recordEnergy(
                meterId,
                kWhScaled,
                Math.floor(timestamp / 1000), // Convert to seconds
                carbonTagNum,
                dataHash
            );
            
            console.log(`⏳ Transaction sent: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            // Parse event to get receipt ID
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'EnergyRecorded';
                } catch { return false; }
            });
            
            let receiptId = null;
            if (event) {
                const parsed = this.contract.interface.parseLog(event);
                receiptId = parsed.args[0].toString();
            }
            
            console.log(`✅ Energy recorded: Receipt #${receiptId}`);
            
            return {
                success: true,
                receiptId,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Record energy failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Mint energy token for a receipt
     */
    async mintToken(receiptId) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        try {
            console.log(`🏭 Minting token for receipt #${receiptId}`);
            
            const tx = await this.contract.mintEnergyToken(receiptId);
            const receipt = await tx.wait();
            
            // Parse event to get token ID
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'TokenMinted';
                } catch { return false; }
            });
            
            let tokenId = null;
            if (event) {
                const parsed = this.contract.interface.parseLog(event);
                tokenId = parsed.args[0].toString();
            }
            
            console.log(`✅ Token minted: Token #${tokenId}`);
            
            return {
                success: true,
                tokenId,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Mint token failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Burn energy token
     */
    async burnToken(tokenId) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        try {
            console.log(`🔥 Burning token #${tokenId}`);
            
            const tx = await this.contract.burnEnergyToken(tokenId);
            const receipt = await tx.wait();
            
            console.log(`✅ Token burned: Token #${tokenId}`);
            
            return {
                success: true,
                tokenId,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Burn token failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Record settlement reference
     */
    async recordSettlement(receiptId, tokenId, paymentRef, amountPaise) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        try {
            console.log(`💰 Recording settlement: Receipt #${receiptId}, Token #${tokenId}`);
            
            const tx = await this.contract.recordSettlement(
                receiptId,
                tokenId,
                paymentRef,
                amountPaise
            );
            
            const receipt = await tx.wait();
            
            // Parse event to get settlement ID
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.contract.interface.parseLog(log);
                    return parsed.name === 'SettlementRecorded';
                } catch { return false; }
            });
            
            let settlementId = null;
            if (event) {
                const parsed = this.contract.interface.parseLog(event);
                settlementId = parsed.args[0].toString();
            }
            
            console.log(`✅ Settlement recorded: Settlement #${settlementId}`);
            
            return {
                success: true,
                settlementId,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Record settlement failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Get contract statistics
     */
    async getStats() {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        const stats = await this.contract.getStats();
        return {
            totalReceipts: stats[0].toString(),
            totalTokens: stats[1].toString(),
            totalSettlements: stats[2].toString()
        };
    }
    
    /**
     * Get receipt details
     */
    async getReceipt(receiptId) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        const receipt = await this.contract.getReceipt(receiptId);
        return {
            meterId: receipt.meterId,
            kWh: receipt.kWh.toString(),
            timestamp: receipt.timestamp.toString(),
            carbonTag: receipt.carbonTag === 1n ? 'GREEN' : 'NORMAL',
            tokenized: receipt.tokenized
        };
    }
    
    /**
     * Get token details
     */
    async getToken(tokenId) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        const token = await this.contract.getToken(tokenId);
        return {
            receiptId: token.receiptId.toString(),
            kWh: token.kWh.toString(),
            carbonTag: token.carbonTag === 1n ? 'GREEN' : 'NORMAL',
            status: token.status === 0n ? 'ACTIVE' : 'BURNED',
            mintedAt: token.mintedAt.toString()
        };
    }
    
    /**
     * Get settlement details
     */
    async getSettlement(settlementId) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        const settlement = await this.contract.getSettlement(settlementId);
        const statusMap = ['PENDING', 'COMPLETED', 'FAILED'];
        return {
            receiptId: settlement.receiptId.toString(),
            tokenId: settlement.tokenId.toString(),
            paymentRef: settlement.paymentRef,
            amountINR: settlement.amountINR.toString(),
            status: statusMap[Number(settlement.status)]
        };
    }
    
    /**
     * Check if data hash is already used
     */
    async isDataHashUsed(dataHash) {
        if (!this.isConnected) {
            throw new Error('Blockchain not connected');
        }
        
        return await this.contract.isDataHashUsed(dataHash);
    }
}

module.exports = new BlockchainService();

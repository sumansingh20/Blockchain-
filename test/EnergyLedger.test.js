/**
 * ============================================
 * UNIT TESTS FOR ENERGY LEDGER CONTRACT
 * ============================================
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnergyLedger", function () {
    let energyLedger;
    let owner;
    let addr1;
    
    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        
        const EnergyLedger = await ethers.getContractFactory("EnergyLedger");
        energyLedger = await EnergyLedger.deploy();
        await energyLedger.waitForDeployment();
    });
    
    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await energyLedger.owner()).to.equal(owner.address);
        });
        
        it("Should initialize counters to zero", async function () {
            const stats = await energyLedger.getStats();
            expect(stats[0]).to.equal(0n); // receipts
            expect(stats[1]).to.equal(0n); // tokens
            expect(stats[2]).to.equal(0n); // settlements
        });
    });
    
    describe("Record Energy", function () {
        const meterId = "SOLAR-001";
        const kWh = 5000n; // 5 kWh
        const timestamp = Math.floor(Date.now() / 1000);
        const carbonTag = 1; // GREEN
        
        it("Should record energy successfully", async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data-1"));
            
            const tx = await energyLedger.recordEnergy(
                meterId, kWh, timestamp, carbonTag, dataHash
            );
            
            await tx.wait();
            
            const receipt = await energyLedger.getReceipt(1);
            expect(receipt.meterId).to.equal(meterId);
            expect(receipt.kWh).to.equal(kWh);
            expect(receipt.tokenized).to.equal(false);
        });
        
        it("Should emit EnergyRecorded event", async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data-2"));
            
            await expect(energyLedger.recordEnergy(
                meterId, kWh, timestamp, carbonTag, dataHash
            ))
                .to.emit(energyLedger, "EnergyRecorded")
                .withArgs(1, meterId, kWh, carbonTag, timestamp);
        });
        
        it("Should prevent replay attacks (duplicate data hash)", async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data-3"));
            
            await energyLedger.recordEnergy(
                meterId, kWh, timestamp, carbonTag, dataHash
            );
            
            await expect(energyLedger.recordEnergy(
                meterId, kWh, timestamp, carbonTag, dataHash
            )).to.be.revertedWith("EnergyLedger: duplicate data (replay attack prevented)");
        });
        
        it("Should reject non-owner calls", async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data-4"));
            
            await expect(energyLedger.connect(addr1).recordEnergy(
                meterId, kWh, timestamp, carbonTag, dataHash
            )).to.be.revertedWith("EnergyLedger: caller is not the owner");
        });
    });
    
    describe("Mint Token", function () {
        beforeEach(async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("mint-test-data"));
            await energyLedger.recordEnergy(
                "SOLAR-001", 5000n, Math.floor(Date.now() / 1000), 1, dataHash
            );
        });
        
        it("Should mint token for valid receipt", async function () {
            await energyLedger.mintEnergyToken(1);
            
            const token = await energyLedger.getToken(1);
            expect(token.receiptId).to.equal(1n);
            expect(token.kWh).to.equal(5000n);
            expect(token.status).to.equal(0n); // ACTIVE
        });
        
        it("Should prevent double minting", async function () {
            await energyLedger.mintEnergyToken(1);
            
            await expect(energyLedger.mintEnergyToken(1))
                .to.be.revertedWith("EnergyLedger: receipt already tokenized");
        });
        
        it("Should emit TokenMinted event", async function () {
            await expect(energyLedger.mintEnergyToken(1))
                .to.emit(energyLedger, "TokenMinted")
                .withArgs(1, 1, 5000n, owner.address);
        });
    });
    
    describe("Burn Token", function () {
        beforeEach(async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("burn-test-data"));
            await energyLedger.recordEnergy(
                "SOLAR-001", 5000n, Math.floor(Date.now() / 1000), 1, dataHash
            );
            await energyLedger.mintEnergyToken(1);
        });
        
        it("Should burn active token", async function () {
            await energyLedger.burnEnergyToken(1);
            
            const token = await energyLedger.getToken(1);
            expect(token.status).to.equal(1n); // BURNED
        });
        
        it("Should prevent burning already burned token", async function () {
            await energyLedger.burnEnergyToken(1);
            
            await expect(energyLedger.burnEnergyToken(1))
                .to.be.revertedWith("EnergyLedger: token not active");
        });
    });
    
    describe("Record Settlement", function () {
        beforeEach(async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("settlement-test-data"));
            await energyLedger.recordEnergy(
                "SOLAR-001", 5000n, Math.floor(Date.now() / 1000), 1, dataHash
            );
            await energyLedger.mintEnergyToken(1);
        });
        
        it("Should record settlement successfully", async function () {
            await energyLedger.recordSettlement(
                1, 1, "CBDC-REF-12345", 25000n // 250 INR in paise
            );
            
            const settlement = await energyLedger.getSettlement(1);
            expect(settlement.paymentRef).to.equal("CBDC-REF-12345");
            expect(settlement.amountINR).to.equal(25000n);
            expect(settlement.status).to.equal(1n); // COMPLETED
        });
        
        it("Should emit SettlementRecorded event", async function () {
            await expect(energyLedger.recordSettlement(
                1, 1, "CBDC-REF-12345", 25000n
            ))
                .to.emit(energyLedger, "SettlementRecorded")
                .withArgs(1, 1, 1, "CBDC-REF-12345", 25000n);
        });
    });
    
    describe("Statistics", function () {
        it("Should track all counters correctly", async function () {
            // Record 3 energy readings
            for (let i = 1; i <= 3; i++) {
                const dataHash = ethers.keccak256(ethers.toUtf8Bytes(`stats-test-${i}`));
                await energyLedger.recordEnergy(
                    `METER-${i}`, 1000n * BigInt(i), Math.floor(Date.now() / 1000), 0, dataHash
                );
            }
            
            // Mint 2 tokens
            await energyLedger.mintEnergyToken(1);
            await energyLedger.mintEnergyToken(2);
            
            // Record 1 settlement
            await energyLedger.recordSettlement(1, 1, "REF-001", 5000n);
            
            const stats = await energyLedger.getStats();
            expect(stats[0]).to.equal(3n); // receipts
            expect(stats[1]).to.equal(2n); // tokens
            expect(stats[2]).to.equal(1n); // settlements
        });
    });
});

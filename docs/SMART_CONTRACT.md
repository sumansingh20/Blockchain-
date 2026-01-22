# ============================================
# SMART CONTRACT DOCUMENTATION
# ============================================

## EnergyLedger.sol

### Overview

The EnergyLedger smart contract provides:
- Immutable energy receipt storage
- GoO/REC-style token minting
- CBDC settlement reference tracking
- Complete audit trail

### Contract Address

After deployment, find address in:
- `deployments/localhost.json`
- `.env` file (CONTRACT_ADDRESS)

### Functions

#### recordEnergy()
Records verified smart meter data.

```solidity
function recordEnergy(
    string meterId,      // "SOLAR-MAIN-001"
    uint256 kWh,         // 5500 (5.5 kWh × 1000)
    uint256 timestamp,   // Unix timestamp (seconds)
    uint8 carbonTag,     // 0=NORMAL, 1=GREEN
    bytes32 dataHash     // Hash for replay prevention
) returns (uint256 receiptId)
```

**Events Emitted:**
```solidity
event EnergyRecorded(
    uint256 indexed receiptId,
    string meterId,
    uint256 kWh,
    CarbonTag carbonTag,
    uint256 timestamp
);
```

#### mintEnergyToken()
Creates 1:1 kWh token for a receipt.

```solidity
function mintEnergyToken(
    uint256 receiptId
) returns (uint256 tokenId)
```

**Rules:**
- One token per receipt
- Non-transferable
- Owner-only minting

#### burnEnergyToken()
Burns token after settlement.

```solidity
function burnEnergyToken(
    uint256 tokenId
)
```

**Rules:**
- Only active tokens
- Owner-only burning
- Marks as BURNED

#### recordSettlement()
Records CBDC payment reference.

```solidity
function recordSettlement(
    uint256 receiptId,
    uint256 tokenId,
    string paymentRef,    // "CBDC-1706012500-ABC123"
    uint256 amountINR     // Amount in paise
) returns (uint256 settlementId)
```

### Data Structures

#### EnergyReceipt
```solidity
struct EnergyReceipt {
    uint256 receiptId;
    string meterId;
    uint256 kWh;
    uint256 timestamp;
    CarbonTag carbonTag;
    bytes32 dataHash;
    bool tokenized;
    uint256 recordedAt;
}
```

#### EnergyToken
```solidity
struct EnergyToken {
    uint256 tokenId;
    uint256 receiptId;
    uint256 kWh;
    CarbonTag carbonTag;
    address holder;
    TokenStatus status;
    uint256 mintedAt;
    uint256 burnedAt;
}
```

#### Settlement
```solidity
struct Settlement {
    uint256 settlementId;
    uint256 receiptId;
    uint256 tokenId;
    string paymentRef;
    uint256 amountINR;
    SettlementStatus status;
    uint256 settledAt;
}
```

### Mappings

```solidity
mapping(uint256 => EnergyReceipt) public receipts;
mapping(uint256 => EnergyToken) public tokens;
mapping(uint256 => Settlement) public settlements;
mapping(string => uint256[]) public meterReceipts;
mapping(bytes32 => bool) public usedDataHashes;
```

### View Functions

```solidity
function getReceipt(uint256 id) view returns (...)
function getToken(uint256 id) view returns (...)
function getSettlement(uint256 id) view returns (...)
function getStats() view returns (totalReceipts, totalTokens, totalSettlements)
function getMeterReceipts(string meterId) view returns (uint256[])
function isDataHashUsed(bytes32 hash) view returns (bool)
```

### Security

1. **Owner-Only Functions**
   - recordEnergy
   - mintEnergyToken
   - burnEnergyToken
   - recordSettlement

2. **Replay Prevention**
   - dataHash checked against usedDataHashes
   - Cannot record duplicate data

3. **Validation**
   - Non-zero kWh
   - Valid carbon tag
   - No future timestamps
   - Receipt-token matching

### Deployment

```bash
# Compile
npx hardhat compile

# Deploy to local
npx hardhat run scripts/deploy.js --network localhost

# Run tests
npx hardhat test
```

### Gas Estimates

| Function | Estimated Gas |
|----------|---------------|
| recordEnergy | ~150,000 |
| mintEnergyToken | ~100,000 |
| burnEnergyToken | ~50,000 |
| recordSettlement | ~120,000 |

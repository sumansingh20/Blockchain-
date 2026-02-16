# ============================================
# CBDC (e₹) WALLET SYSTEM DOCUMENTATION
# ============================================

## Overview

The CBDC Wallet Simulator models RBI's Digital Rupee (e₹) system for
campus energy settlements. This is a SIMULATION - not actual CBDC integration.

## Key Concepts

### 1. Wallet Types

| Type | Description | Use Case |
|------|-------------|----------|
| TREASURY | University central fund | Pays for energy, receives from consumers |
| HOSTEL | Hostel building wallet | Pays for consumption |
| LAB | Laboratory wallet | Pays for consumption |
| SOLAR | Producer wallet | Receives payment for generation |
| ESCROW | Temporary holding | Locked funds during settlement |

### 2. Transaction Flow

```
PRODUCTION (Solar):
┌──────────────┐     ┌──────────────┐
│   TREASURY   │────▶│    SOLAR     │
│   -₹50.00    │     │   +₹50.00    │
└──────────────┘     └──────────────┘
   (Payer)             (Receiver)

CONSUMPTION (Hostel):
┌──────────────┐     ┌──────────────┐
│    HOSTEL    │────▶│   TREASURY   │
│   -₹75.00    │     │   +₹75.00    │
└──────────────┘     └──────────────┘
   (Payer)             (Receiver)
```

### 3. Settlement Process

1. **Energy Proof Verification**
   - Receipt ID from blockchain
   - Token ID verified
   - kWh and carbon tag checked

2. **Balance Check**
   - Verify payer has sufficient funds
   - Check for locked amounts

3. **Fund Transfer**
   - Debit payer wallet
   - Credit receiver wallet
   - Generate payment reference

4. **Blockchain Recording**
   - Settlement reference stored on-chain
   - Immutable audit trail created

## Wallet Data Structure

```javascript
{
  walletId: "TREASURY-MAIN",
  type: "TREASURY",
  name: "University Treasury",
  balance: 100000000,        // Total balance in paise
  lockedBalance: 0,          // Funds held in escrow
  availableBalance: 100000000,// balance - lockedBalance
  createdAt: 1706012400000,
  updatedAt: 1706012500000,
  transactionCount: 15
}
```

## Transaction Record

```javascript
{
  txId: "TX-1706012500000-ABC123",
  type: "SETTLEMENT",
  walletId: "TREASURY-MAIN",
  amount: -5000,             // Negative = debit
  reference: "CBDC-1706012500000-XYZ789",
  description: "Energy payment for receipt #1",
  balanceAfter: 99995000,
  status: "COMPLETED",
  timestamp: 1706012500000,
  metadata: {
    energyProof: {...},
    counterparty: "SOLAR-MAIN-001"
  }
}
```

## Escrow Mechanism

For high-value or conditional transfers:

1. **Lock Funds**
   ```
   lockFunds(walletId, amount, escrowId, reason)
   ```
   - Moves funds from available to locked
   - Creates escrow record

2. **Release Funds**
   ```
   releaseFunds(escrowId, targetWallet, energyProof)
   ```
   - Requires valid energy proof
   - Transfers from locked to target
   - Updates escrow status

## API Endpoints

### List All Wallets
```
GET /api/wallet/all
```

### Get Wallet Details
```
GET /api/wallet/:walletId
```

### Get Wallet Transactions
```
GET /api/wallet/:walletId/transactions
```

### Get CBDC Statistics
```
GET /api/wallet/stats
```

## Error Handling

### Insufficient Balance
```javascript
{
  success: false,
  error: "Insufficient funds",
  compensation: {
    required: 5000,
    available: 3000,
    shortfall: 2000
  }
}
```

### Wallet Not Found
```javascript
{
  success: false,
  error: "Wallet UNKNOWN-001 not found"
}
```

## RBI CBDC Alignment

This simulator follows RBI's conceptual framework:
- Central bank liability (simulated by Treasury)
- Programmable payments (conditional release)
- Transaction traceability
- Instant settlement
- Non-interest bearing

## Limitations

- NOT connected to real banking systems
- NO actual money movement
- Simulation for educational purposes
- Single-node (no distribution)

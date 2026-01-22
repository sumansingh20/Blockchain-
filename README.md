# 🏛️ NIT Jalandhar - Tokenized Campus Energy Trade

## Blockchain Provenance and CBDC (e₹) Settlement

**Dr B R Ambedkar National Institute of Technology, Jalandhar**  
📍 GT Road Bypass, Jalandhar, Punjab 144027, India

A campus-scale system for NIT Jalandhar demonstrating:
- Smart meter energy data generation, signing, and verification
- Blockchain-based immutable proof and audit trail
- GoO/REC-style energy tokenization
- PSPCL Punjab tariff-based pricing (₹6.79/kWh base + Time-of-Use)
- CBDC (Digital Rupee e₹) settlement simulation

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NIT JALANDHAR CAMPUS ENERGY TRADE                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ NITJ-SOLAR   │  │ MEGA HOSTEL  │  │ BOYS HOSTELS │  │ CSE/ECE DEPT ││
│  │  250 kW      │  │  1500 Students│ │  BH1-BH4     │  │   + CCF Lab  ││
│  │  (GREEN)     │  │   (NORMAL)   │  │  (NORMAL)    │  │   (NORMAL)   ││
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘│
│         │                 │                 │                 │         │
│         └─────────────────┼─────────────────┼─────────────────┘         │
│                           ▼                                             │
│                 ┌─────────────────┐                                     │
│                 │   BACKEND API   │                                     │
│                 │   (Express.js)  │                                     │
│                 └────────┬────────┘                                     │
│                          │                                              │
│         ┌────────────────┼────────────────┐                             │
│         ▼                ▼                ▼                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │  Blockchain │  │   Policy    │  │ CBDC Wallet │                      │
│  │ (Ethereum)  │  │   Engine    │  │  Manager    │                      │
│  │             │  │             │  │             │                      │
│  │ - Receipts  │  │ - PSPCL ToU │  │ - Treasury  │                      │
│  │ - Tokens    │  │ - ₹6.79/kWh │  │ - Hostels   │                      │
│  │ - Settle    │  │ - Solar 15% │  │ - Depts     │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
│                          │                                              │
│                          ▼                                              │
│                ┌─────────────────┐                                      │
│                │    DASHBOARD    │                                      │
│                │   (HTML/JS)     │                                      │
│                └─────────────────┘                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🏢 NIT Jalandhar Campus Buildings

| Building | Meter ID | Type | Capacity |
|----------|----------|------|----------|
| Main Building Solar | NITJ-SOLAR-MAIN | Producer | 100 kW |
| Mega Hostel Solar | NITJ-SOLAR-MEGA | Producer | 75 kW |
| Library Solar | NITJ-SOLAR-LIBRARY | Producer | 50 kW |
| Mega Boys Hostel | NITJ-MEGA-HOSTEL | Consumer | ~1500 students |
| Boys Hostel 1-4 | NITJ-BH1 to BH4 | Consumer | ~300 each |
| Girls Hostel 1-2 | NITJ-GH1, GH2 | Consumer | ~200 each |
| CSE Department | NITJ-CSE-DEPT | Consumer | Academic |
| ECE Department | NITJ-ECE-DEPT | Consumer | Academic |
| ME Department | NITJ-ME-DEPT | Consumer | Academic |
| Central Computing Facility | NITJ-CCF | Consumer | Lab |
| Central Workshop | NITJ-WORKSHOP | Consumer | Lab |
| Central Library | NITJ-LIBRARY | Consumer | Academic |
| Administrative Block | NITJ-ADMIN | Consumer | Admin |

---

## ⚡ PSPCL Punjab Tariff Structure

NIT Jalandhar is under **PSPCL Large Supply (LS) Category** for educational institutions:

| Time Period | Hours | Rate | Multiplier |
|-------------|-------|------|------------|
| **Peak Hours** | 6 PM - 10 PM | ₹8.15/kWh | 1.2x |
| **Normal Hours** | 6 AM - 6 PM | ₹6.79/kWh | 1.0x |
| **Night Rebate** | 10 PM - 6 AM | ₹6.11/kWh | 0.9x |

**Additional:**
- Solar/Green Energy Discount: **15%**
- Solar Feed-in Rate: **₹4.00/kWh**
- PSPCL Surcharges: Fuel Adjustment (5%), Electricity Duty (5%), Pension Surcharge (2%)

---

## 📁 Project Structure

```
campus-energy/
├── contracts/
│   └── EnergyLedger.sol      # Solidity smart contract
├── backend/
│   ├── server.js             # Express.js main server
│   ├── blockchain.js         # ethers.js blockchain service
│   ├── policyEngine.js       # PSPCL Time-of-Use & carbon pricing
│   └── cbdcWallet.js         # CBDC (e₹) wallet simulator
├── meter/
│   ├── simulator.js          # NIT Jalandhar meter simulator
│   ├── meter_simulator.py    # Smart meter simulator (Python)
│   └── continuous-simulator.js # Continuous meter streaming
├── frontend/
│   └── index.html            # NIT Jalandhar Dashboard UI
├── scripts/
│   ├── deploy.js             # Hardhat deployment script
│   └── demo.js               # NIT Jalandhar demo scenarios
├── test/
│   └── EnergyLedger.test.js  # Contract unit tests
├── deployments/              # Deployment artifacts
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies
├── .env.example              # Environment template
└── README.md                 # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ 
- npm or yarn
- Git

### Installation

```bash
# Navigate to project
cd campus-energy

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Running the System

**Terminal 1: Start Hardhat Node**
```bash
npx hardhat node
```

**Terminal 2: Deploy Contract & Start Server**
```bash
# Deploy contract
npm run deploy

# Start backend server
npm run server
```

**Terminal 3: Run Demo (Optional)**
```bash
# Run automated demo
npm run demo

# Or start continuous meter simulation
npm run meter:continuous
```

**Open Dashboard**
```
http://localhost:3000
```

---

## 📋 Module Details

### 1️⃣ Smart Meter Simulator

Simulates energy meters for solar panels, hostels, and labs.

**Features:**
- Realistic time-based energy patterns
- Digital signature for data integrity
- Data hash for replay prevention
- Carbon tagging (GREEN/NORMAL)

**Output Format:**
```json
{
  "meterId": "SOLAR-MAIN-001",
  "kWh": 5.234,
  "kWhScaled": 5234,
  "timestamp": 1706012400000,
  "carbonTag": "GREEN",
  "type": "SOLAR",
  "signature": "a1b2c3...",
  "dataHash": "0x4f5e6d..."
}
```

**Usage:**
```bash
# Run demo
node meter/simulator.js

# Python version
python meter/meter_simulator.py
```

### 2️⃣ Blockchain Smart Contract

`EnergyLedger.sol` handles:

| Function | Description |
|----------|-------------|
| `recordEnergy()` | Record verified meter data |
| `mintEnergyToken()` | Create 1:1 kWh token |
| `burnEnergyToken()` | Burn after settlement |
| `recordSettlement()` | Store CBDC payment reference |

**Key Features:**
- 1 Token = 1 kWh
- Non-transferable tokens
- Replay attack prevention via data hash
- Owner-only minting/burning

**Deployment:**
```bash
npm run deploy
```

### 3️⃣ Backend Service (Brain)

Express.js API orchestrating all components.

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/energy/record` | Record energy data |
| GET | `/api/energy/receipts` | List all receipts |
| GET | `/api/energy/receipt/:id` | Get receipt details |
| GET | `/api/policy/config` | Get pricing policy |
| POST | `/api/policy/calculate` | Calculate price |
| GET | `/api/wallet/all` | List all wallets |
| GET | `/api/wallet/:id` | Get wallet balance |
| GET | `/api/dashboard/summary` | Dashboard data |
| GET | `/api/blockchain/stats` | Blockchain stats |

### 4️⃣ Policy Engine

Calculates energy pricing based on:

**Formula:**
```
Price = BaseRate × kWh × TimeMultiplier × (1 - GreenDiscount)
```

**Time-of-Use:**
| Period | Hours | Multiplier |
|--------|-------|------------|
| Peak | 18:00 - 21:00 | 1.5x |
| Off-Peak | Other | 1.0x |

**Carbon Discount:**
| Tag | Discount |
|-----|----------|
| GREEN | 10% |
| NORMAL | 0% |

### 5️⃣ CBDC (e₹) Wallet Simulator

Simulates RBI's Digital Rupee system.

**Features:**
- Multiple wallet types (Treasury, Hostel, Solar, Lab)
- Balance management
- Escrow/lock mechanism
- Conditional fund release
- Transaction history

**Default Wallets:**
| Wallet | Type | Initial Balance |
|--------|------|-----------------|
| TREASURY-MAIN | Treasury | ₹10,00,000 |
| HOSTEL-BLOCK-A | Hostel | ₹5,00,000 |
| SOLAR-MAIN-001 | Producer | ₹0 |

### 6️⃣ Dashboard

Visual interface showing:
- Total energy produced/consumed
- Green energy percentage
- Tokens minted/burned
- e₹ settlements
- Blockchain transaction hashes
- Wallet balances

---

## 🎬 Demo Flow

```
Step 1: Meter generates energy reading
        ↓
Step 2: Backend validates data (signature, replay check)
        ↓
Step 3: Blockchain receipt created (immutable proof)
        ↓
Step 4: Energy token minted (1 Token = 1 kWh)
        ↓
Step 5: Policy engine calculates price
        ↓
Step 6: CBDC (e₹) settlement executed
        ↓
Step 7: Settlement recorded on blockchain
        ↓
Step 8: Token burned (consumed)
        ↓
Step 9: Dashboard updated
```

---

## 🔐 Security Features

### 1. Replay Attack Prevention
- Each meter reading has unique `dataHash`
- Blockchain rejects duplicate hashes
- Nonce included in hash calculation

### 2. Invalid Meter Data Rejection
- Schema validation in policy engine
- Positive kWh verification
- Timestamp validation (no future dates)
- Carbon tag validation

### 3. Payment Failure Compensation
- Balance check before transfer
- Error response with shortfall details
- Transaction rollback on failure

---

## 🧪 Testing

```bash
# Run contract tests
npm run test

# Run policy engine tests
node backend/policyEngine.js

# Run CBDC wallet tests
node backend/cbdcWallet.js
```

---

## 📊 Screenshot Checklist

When demoing, capture:
- [ ] Dashboard overview
- [ ] Energy statistics cards
- [ ] Wallet balances
- [ ] Recent transactions table
- [ ] Blockchain hashes
- [ ] Policy configuration
- [ ] Terminal logs showing flow

---

## 🔮 Future Scope

1. **Real CBDC Integration** - Connect to actual RBI sandbox when available
2. **Multi-Campus Federation** - Cross-campus energy trading
3. **AI-Powered Forecasting** - Predict energy production/consumption
4. **Mobile App** - React Native dashboard
5. **Hardware Integration** - Real smart meter connectivity
6. **Carbon Credits** - Integrate with carbon credit markets
7. **Peer-to-Peer Trading** - Direct student-to-student energy sales

---

## 📄 License

MIT License - Feel free to use for educational purposes.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Email: campus-energy@example.com

---

**Built with ❤️ for sustainable campus energy management**

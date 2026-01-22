# NIT Jalandhar - Campus Energy Trade System

<div align="center">
  <h3>⚡ Tokenized Campus Energy Trade with Blockchain Provenance and CBDC (e₹) Settlement</h3>
  <p>Dr B R Ambedkar National Institute of Technology, Jalandhar</p>
  
  ![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
  ![Node.js](https://img.shields.io/badge/Node.js-18+-green)
  ![License](https://img.shields.io/badge/License-MIT-yellow)
</div>

---

## 🌟 Overview

A complete blockchain-based energy trading platform designed for NIT Jalandhar campus. The system records energy consumption on Ethereum blockchain, mints energy tokens (NFT certificates), and settles payments using simulated CBDC (e₹) wallets.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| ⛓️ **Blockchain Provenance** | Immutable energy receipts on Ethereum |
| 🪙 **Energy Tokenization** | ERC-721 compatible energy certificates |
| 💰 **CBDC Settlement** | RBI Digital Rupee (e₹) simulation |
| 📊 **PSPCL Tariff** | Punjab electricity rates with ToU pricing |
| 📡 **Smart Meters** | 15 campus zone meters simulation |
| 🌱 **Carbon Tracking** | GREEN, RENEWABLE, CERTIFIED tags |

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Smart Meter   │────▶│  Energy Receipt │────▶│  Energy Token   │
│   (Simulator)   │     │   (Blockchain)  │     │     (NFT)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PSPCL Tariff  │────▶│  Price Engine   │────▶│  CBDC Wallet    │
│    (₹6.79/kWh)  │     │  (Peak/Off-Peak)│     │  (e₹ Transfer)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/sumansingh20/Blockchain-.git
cd Blockchain-/campus-energy

# Install dependencies
npm install
```

### Running the System

**Terminal 1: Start Hardhat Node**
```bash
npm run node
```

**Terminal 2: Deploy Contract**
```bash
npm run deploy
```

**Terminal 3: Start Backend Server**
```bash
npm run server
```

**Terminal 4: Run Demo**
```bash
npm run demo
```

### Access Dashboard

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
campus-energy/
├── contracts/
│   └── EnergyLedger.sol      # Smart contract
├── backend/
│   ├── server.js             # Express.js API server
│   ├── blockchain.js         # ethers.js integration
│   ├── policyEngine.js       # PSPCL tariff calculator
│   ├── cbdcWallet.js         # CBDC wallet manager
│   └── utils.js              # Helper utilities
├── frontend/
│   └── dashboard.html        # Web dashboard
├── meter/
│   └── simulator.js          # Smart meter simulator
├── scripts/
│   ├── deploy.js             # Deployment script
│   └── demo.js               # Demo scenarios
├── index.html                # GitHub Pages landing
├── package.json
└── hardhat.config.js
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/transaction/complete` | POST | Full energy transaction |
| `/api/energy/record` | POST | Record energy receipt |
| `/api/token/mint` | POST | Mint energy token |
| `/api/settlement/create` | POST | Create CBDC settlement |
| `/api/pricing/calculate` | POST | Calculate tariff |
| `/api/wallet/all` | GET | Get all wallet balances |
| `/api/statistics` | GET | Blockchain statistics |

## 💰 PSPCL Tariff Structure

| Period | Time | Rate | Multiplier |
|--------|------|------|------------|
| **NORMAL** | 6 AM - 6 PM | ₹6.79/kWh | 1.0x |
| **PEAK** | 6 PM - 10 PM | ₹8.15/kWh | 1.2x |
| **OFF-PEAK** | 10 PM - 6 AM | ₹6.11/kWh | 0.9x |

## 🏛️ Campus Meters

| Zone | Meter ID | Building |
|------|----------|----------|
| HOSTEL | NITJ-MH1-001 | Mega Hostel Block-1 |
| HOSTEL | NITJ-MH2-002 | Mega Hostel Block-2 |
| HOSTEL | NITJ-GH1-003 | Girls Hostel |
| ACADEMIC | NITJ-MB1-004 | Main Building |
| ACADEMIC | NITJ-CS1-006 | Computer Science Block |
| LIBRARY | NITJ-LIB-010 | Central Library |
| WORKSHOP | NITJ-WKS-012 | Central Workshop |

## 💳 CBDC Wallets

| Wallet ID | Balance | Department |
|-----------|---------|------------|
| NITJ_MAIN | ₹50,00,000 | Finance Office |
| NITJ_HOSTELS | ₹10,00,000 | Chief Warden |
| NITJ_ACADEMIC | ₹15,00,000 | Academic Section |
| NITJ_WORKSHOP | ₹8,00,000 | Workshop Superintendent |
| PSPCL_GRID | Receiving | Grid Operator |

## 🛠️ Technology Stack

- **Smart Contract**: Solidity 0.8.19, OpenZeppelin
- **Blockchain**: Ethereum (Hardhat local network)
- **Backend**: Node.js, Express.js
- **Web3**: ethers.js v6
- **Frontend**: HTML5, CSS3, JavaScript

## 📊 Demo Output

```
╔═══════════════════════════════════════════════════════════════════╗
║   NIT JALANDHAR - CAMPUS ENERGY TRADE DEMO v2.0                   ║
╚═══════════════════════════════════════════════════════════════════╝

[01] ✅ Main Building - Morning Classes
     Meter: NITJ-MB1-004 | 15.5 kWh | GREEN
     Receipt #1 → Token #1 → Settlement #1
     Amount: ₹105.25 (NORMAL rate)

[02] ✅ Mega Hostel Block-1
     Meter: NITJ-MH1-001 | 25.2 kWh | NORMAL
     Receipt #2 → Token #2 → Settlement #2
     Amount: ₹171.11 (NORMAL rate)

📊 DEMO SUMMARY
   Total Energy: 385.6 kWh
   Total Amount: ₹2,618.22
   Receipts: 18 | Tokens: 18 | Settlements: 18
```

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👥 Contributors

- NIT Jalandhar Energy Team

## 🔗 Links

- [GitHub Repository](https://github.com/sumansingh20/Blockchain-)
- [NIT Jalandhar](https://nitj.ac.in)
- [PSPCL](https://pspcl.in)
- [RBI CBDC](https://rbi.org.in/Scripts/PublicationsView.aspx?id=21920)

---

<div align="center">
  <p>Built with ❤️ at NIT Jalandhar</p>
  <p>⚡ Powering Sustainable Campus Energy Management</p>
</div>

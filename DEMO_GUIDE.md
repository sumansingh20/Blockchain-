# ============================================
# DEMO FLOW DOCUMENTATION
# ============================================
# Step-by-step guide for demonstrating the
# Campus Energy Trade system
# ============================================

## 🎯 PRE-DEMO SETUP

### Step 1: Install Dependencies
```bash
cd campus-energy
npm install
```

### Step 2: Start Hardhat Local Node
Open Terminal 1:
```bash
npx hardhat node
```
Keep this running. You should see accounts with 10000 ETH each.

### Step 3: Deploy Smart Contract
Open Terminal 2:
```bash
npm run deploy
```
Note the contract address displayed.

### Step 4: Start Backend Server
In Terminal 2:
```bash
npm run server
```
Server should show "Connected to EnergyLedger contract".

---

## 🎬 DEMO SCRIPT

### SCENE 1: Dashboard Overview
1. Open browser: http://localhost:3000
2. Show the empty dashboard
3. Explain the components:
   - Energy statistics (top cards)
   - Blockchain stats
   - CBDC wallets
   - Recent transactions

### SCENE 2: Smart Meter Simulation
Open Terminal 3:
```bash
npm run demo
```

Narrate each step:
1. "Meter generates signed energy reading"
2. "Backend validates signature and checks for replay"
3. "Data recorded on blockchain - receipt created"
4. "Energy token minted - 1 token per kWh"
5. "Policy engine calculates price based on time and carbon tag"
6. "CBDC settlement executed between wallets"
7. "Settlement reference stored on blockchain"

### SCENE 3: Real-time Dashboard
Switch to browser and refresh:
1. Show updated energy statistics
2. Show green energy percentage
3. Show e₹ settled amount
4. Show recent transactions with hashes
5. Show wallet balance changes

### SCENE 4: API Exploration
Open new browser tabs:
- http://localhost:3000/api/health
- http://localhost:3000/api/blockchain/stats
- http://localhost:3000/api/wallet/all
- http://localhost:3000/api/policy/config

### SCENE 5: Continuous Simulation
```bash
npm run meter:continuous
```
Watch dashboard auto-refresh with new data.

---

## 📊 KEY TALKING POINTS

### Blockchain Benefits
- Immutable audit trail
- Tamper-proof receipts
- Verifiable energy provenance
- Smart contract automation

### CBDC Advantages
- Instant settlement
- Programmable money
- Reduced transaction costs
- Central bank backing

### Policy Engine
- Time-of-Use pricing
- Green energy incentives
- Automated calculations
- Transparent rules

### Security Features
- Digital signatures on meter data
- Replay attack prevention
- Data validation
- Access control on contracts

---

## ❓ FAQ FOR DEMO

Q: Why blockchain instead of database?
A: Immutability, transparency, auditability - cannot tamper with records.

Q: Why simulate CBDC?
A: RBI sandbox not publicly available yet. This simulates the concepts.

Q: Can this scale?
A: Local demo. Production would use Layer 2 or sidechains.

Q: What about real meters?
A: Would connect via IoT protocols (MQTT, HTTP) with same data format.

---

## 🚨 TROUBLESHOOTING

### "Blockchain not connected"
- Ensure Hardhat node is running
- Run `npm run deploy` again

### "Contract address not found"
- Check deployments/localhost.json exists
- Re-run `npm run deploy`

### "CBDC settlement failed"
- Check wallet has sufficient balance
- View error in terminal logs

### Dashboard not updating
- Check browser console for errors
- Verify server is running
- Try manual refresh

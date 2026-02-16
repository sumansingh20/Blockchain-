/**
 * NIT Jalandhar Campus Energy - Demo Data
 * Pre-recorded blockchain data for Vercel deployment
 */

const DEMO_DATA = {
    contract: {
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        network: "Ethereum (Hardhat Local)",
        version: "2.0.0",
        institution: "Dr B R Ambedkar NIT Jalandhar"
    },
    
    statistics: {
        receipts: 18,
        tokens: 18,
        settlements: 18,
        totalEnergy: 370.9,
        greenEnergy: 37.1,  // Total SOLAR energy (15.5 + 8.9 + 7.5 + 5.2)
        settlementValue: 2681.43
    },
    
    // CBDC Wallets per Problem Statement Section 2 (Target Users & Roles)
    wallets: {
        // Producers - Campus solar, lab micro-gen
        NITJ_SOLAR: { name: "Campus Solar Rooftop", balance: 50000.00, type: "e₹-R Producer" },
        NITJ_MICRO_GEN: { name: "Lab Micro-Gen Unit", balance: 25000.00, type: "e₹-R Producer" },
        
        // Consumers - Hostels, departments, EV chargers, research labs
        NITJ_HOSTELS: { name: "Hostels (Consumer)", balance: 999018.23, type: "e₹-R Consumer" },
        NITJ_ACADEMIC: { name: "Academic Depts", balance: 1499215.60, type: "e₹-R Consumer" },
        NITJ_EV_CHARGER: { name: "EV Charging Station", balance: 150000.00, type: "e₹-R Consumer" },
        NITJ_RESEARCH: { name: "Research Labs", balance: 350000.00, type: "e₹-R Consumer" },
        
        // Treasury/Finance - University + partnered bank
        NITJ_TREASURY: { name: "University Treasury", balance: 4999796.12, type: "e₹-W Wholesale" },
        PARTNER_BANK: { name: "Partner Bank (SBI)", balance: 10000000.00, type: "e₹-W Wholesale" },
        
        // Utilities/Grid
        PSPCL_GRID: { name: "PSPCL Punjab Grid", balance: 2681.43, type: "e₹-W Utility" },
        RBI_ESCROW: { name: "RBI CBDC Escrow", balance: 50000000.00, type: "e₹ Escrow" }
    },
    
    transactions: [
        { id: 1, meterId: "NITJ-MB1-004", kWh: 15.5, carbonTag: "SOLAR", amount: 112.06, location: "Main Building", timestamp: "2026-01-22T12:06:58Z" },
        { id: 2, meterId: "NITJ-LH1-005", kWh: 12.3, carbonTag: "GRID", amount: 88.92, location: "Lecture Hall Complex", timestamp: "2026-01-22T12:07:00Z" },
        { id: 3, meterId: "NITJ-CS1-006", kWh: 18.7, carbonTag: "GRID", amount: 135.19, location: "Computer Science Block", timestamp: "2026-01-22T12:07:01Z" },
        { id: 4, meterId: "NITJ-MH1-001", kWh: 25.2, carbonTag: "GRID", amount: 182.18, location: "Mega Hostel Block-1", timestamp: "2026-01-22T12:07:02Z" },
        { id: 5, meterId: "NITJ-MH2-002", kWh: 23.8, carbonTag: "HYBRID", amount: 172.06, location: "Mega Hostel Block-2", timestamp: "2026-01-22T12:07:03Z" },
        { id: 6, meterId: "NITJ-GH1-003", kWh: 18.5, carbonTag: "GRID", amount: 133.75, location: "Girls Hostel Block-1", timestamp: "2026-01-22T12:07:04Z" },
        { id: 7, meterId: "NITJ-LIB-010", kWh: 8.9, carbonTag: "SOLAR", amount: 64.34, location: "Central Library (Solar)", timestamp: "2026-01-22T12:07:06Z" },
        { id: 8, meterId: "NITJ-ADM-009", kWh: 10.2, carbonTag: "HYBRID", amount: 73.74, location: "Administrative Block", timestamp: "2026-01-22T12:07:07Z" },
        { id: 9, meterId: "NITJ-TBI-013", kWh: 7.5, carbonTag: "SOLAR", amount: 54.22, location: "TBI Research Center", timestamp: "2026-01-22T12:07:08Z" },
        { id: 10, meterId: "NITJ-WKS-012", kWh: 45.6, carbonTag: "GRID", amount: 329.67, location: "Central Workshop", timestamp: "2026-01-22T12:07:09Z" },
        { id: 11, meterId: "NITJ-ME1-008", kWh: 32.4, carbonTag: "GRID", amount: 234.24, location: "Mechanical Engineering", timestamp: "2026-01-22T12:07:10Z" },
        { id: 12, meterId: "NITJ-ECE-007", kWh: 22.1, carbonTag: "HYBRID", amount: 159.77, location: "ECE Department", timestamp: "2026-01-22T12:07:12Z" },
        { id: 13, meterId: "NITJ-SPT-011", kWh: 28.5, carbonTag: "GRID", amount: 206.04, location: "Sports Complex", timestamp: "2026-01-22T12:07:13Z" },
        { id: 14, meterId: "NITJ-CAF-015", kWh: 15.8, carbonTag: "GRID", amount: 114.23, location: "Central Cafeteria", timestamp: "2026-01-22T12:07:14Z" },
        { id: 15, meterId: "NITJ-MH1-001", kWh: 35.2, carbonTag: "GRID", amount: 254.48, location: "Mega Hostel Block-1 (Peak)", timestamp: "2026-01-22T12:07:15Z" },
        { id: 16, meterId: "NITJ-MH2-002", kWh: 33.1, carbonTag: "HYBRID", amount: 239.30, location: "Mega Hostel Block-2 (Peak)", timestamp: "2026-01-22T12:07:16Z" },
        { id: 17, meterId: "NITJ-FH1-014", kWh: 12.4, carbonTag: "GRID", amount: 89.65, location: "Faculty Housing", timestamp: "2026-01-22T12:07:17Z" },
        { id: 18, meterId: "NITJ-LIB-010", kWh: 5.2, carbonTag: "SOLAR", amount: 37.59, location: "Library (Night Study)", timestamp: "2026-01-22T12:07:19Z" }
    ],
    
    tariff: {
        baseRate: 6.79,
        peakMultiplier: 1.2,
        offPeakMultiplier: 0.9,
        greenDiscount: 0.05,
        provider: "PSPCL Punjab"
    }
};

module.exports = DEMO_DATA;

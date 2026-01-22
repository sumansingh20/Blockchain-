/**
 * Statistics API - Vercel Serverless Function
 */

const DEMO_DATA = require('./demoData');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    // Calculate energy by source
    const energyBySource = { SOLAR: 0, GRID: 0, HYBRID: 0 };
    DEMO_DATA.transactions.forEach(tx => {
        if (energyBySource[tx.carbonTag] !== undefined) {
            energyBySource[tx.carbonTag] += tx.kWh;
        }
    });
    
    res.status(200).json({
        success: true,
        data: {
            totalEnergy: DEMO_DATA.statistics.totalEnergy,
            totalSettled: DEMO_DATA.statistics.settlementValue.toFixed(2),
            totalTransactions: DEMO_DATA.statistics.receipts,
            greenEnergy: DEMO_DATA.statistics.greenEnergy,
            energyBySource: energyBySource,
            generated: new Date().toISOString()
        }
    });
};

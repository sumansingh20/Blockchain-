/**
 * Statistics API - Vercel Serverless Function
 */

const DEMO_DATA = require('./demoData');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
        success: true,
        data: {
            blockchain: DEMO_DATA.statistics,
            cbdc: {
                totalTransactions: DEMO_DATA.statistics.settlements,
                totalVolume: DEMO_DATA.statistics.settlementValue
            },
            generated: new Date().toISOString()
        }
    });
};

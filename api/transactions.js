/**
 * Transactions API - Vercel Serverless Function
 */

const DEMO_DATA = require('./demoData');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const transactions = DEMO_DATA.transactions.map(tx => ({
        receipt: {
            receiptId: tx.id,
            meterId: tx.meterId,
            kWh: tx.kWh,
            carbonTag: tx.carbonTag,
            timestamp: tx.timestamp
        },
        token: { tokenId: tx.id },
        settlement: { settlementId: tx.id, amount: tx.amount * 100 },
        summary: {
            meterId: tx.meterId,
            kWh: tx.kWh,
            carbonTag: tx.carbonTag,
            location: tx.location
        },
        pricing: { total: tx.amount }
    })).reverse();
    
    res.status(200).json({
        success: true,
        data: transactions
    });
};

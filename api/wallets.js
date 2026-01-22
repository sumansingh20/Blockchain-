/**
 * Wallets API - Vercel Serverless Function
 * CBDC (e₹) Wallet Management for Campus Energy Trade
 */

const DEMO_DATA = require('./demoData');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    // Convert wallets object to array format
    const walletsArray = Object.entries(DEMO_DATA.wallets).map(([id, wallet]) => ({
        id,
        name: wallet.name,
        balance: wallet.balance,
        type: wallet.type || 'e₹-R Retail'
    }));
    
    res.status(200).json({
        success: true,
        data: walletsArray
    });
};

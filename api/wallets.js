/**
 * Wallets API - Vercel Serverless Function
 */

const DEMO_DATA = require('./demoData');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
        success: true,
        data: DEMO_DATA.wallets
    });
};

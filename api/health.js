/**
 * Health Check API - Vercel Serverless Function
 */

const DEMO_DATA = require('./demoData');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
        status: 'healthy',
        mode: 'demo',
        message: 'NIT Jalandhar Campus Energy Trade System',
        contract: DEMO_DATA.contract.address,
        version: DEMO_DATA.contract.version,
        timestamp: new Date().toISOString()
    });
};

/**
 * Advanced Metrics API
 * Real-time KPIs for Campus Energy Trading
 * 
 * Provides:
 * - Provenance integrity metrics
 * - Settlement latency (p50, p95)
 * - Energy accuracy
 * - Carbon offset tracking
 * - CBDC flow analytics
 * 
 * @module AdvancedMetrics
 * @version 2.0.0
 */

const crypto = require('crypto');

// Simulated metrics store
let metricsStore = {
    initialized: false,
    lastUpdate: null,
    data: {}
};

/**
 * Initialize metrics with realistic campus data
 */
function initializeMetrics() {
    const now = Date.now();
    
    metricsStore = {
        initialized: true,
        lastUpdate: new Date().toISOString(),
        data: {
            // Provenance Metrics
            provenance: {
                totalTransactions: 18,
                verifiedTransactions: 18,
                integrityPercentage: 100.0,
                lastVerifiedBlock: 'NITJ-BLK-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
                signatureAlgorithm: 'Ed25519',
                hashAlgorithm: 'SHA3-256'
            },
            
            // Settlement Latency Metrics
            latency: {
                p50Ms: 847,
                p95Ms: 1523,
                p99Ms: 2341,
                avgMs: 912,
                minMs: 234,
                maxMs: 2987,
                samples: 18,
                target: '<3000ms',
                compliant: true
            },
            
            // Energy Accuracy Metrics
            accuracy: {
                meterReadings: 156,
                validatedReadings: 155,
                accuracyPercentage: 99.36,
                errorRatePercentage: 0.064,
                targetErrorRate: '<0.1%',
                compliant: true,
                lastCalibration: new Date(now - 86400000).toISOString()
            },
            
            // Carbon Offset Metrics
            carbon: {
                totalKWh: 370.9,
                solarKWh: 197.8,
                gridKWh: 132.6,
                evKWh: 40.5,
                co2AvoidedKg: 156.3,
                co2EmittedKg: 108.9,
                netCarbonKg: -47.4,
                renewablePercentage: 53.3,
                carbonIntensity: 0.294,
                recsGenerated: 3
            },
            
            // CBDC Flow Metrics
            cbdc: {
                retailTransactions: 15,
                wholesalePositions: 8,
                totalVolumeINR: 2681.43,
                escrowedINR: 0,
                pendingNettingINR: 847.22,
                avgTxValueINR: 178.76,
                nettingCycles: 2,
                nettingEfficiency: 67.4
            },
            
            // System Health
            health: {
                blockchainStatus: 'HEALTHY',
                apiLatencyMs: 45,
                dbConnectionPool: 8,
                activeConnections: 3,
                uptime: '99.97%',
                lastBlockTime: new Date(now - 12000).toISOString()
            }
        }
    };

    return metricsStore;
}

/**
 * Get all metrics
 */
function getAllMetrics() {
    if (!metricsStore.initialized) {
        initializeMetrics();
    }
    
    // Add some variance to simulate real-time updates
    const data = JSON.parse(JSON.stringify(metricsStore.data));
    data.latency.avgMs += Math.floor(Math.random() * 50) - 25;
    data.health.apiLatencyMs = Math.floor(Math.random() * 30) + 30;
    data.lastUpdated = new Date().toISOString();
    
    return data;
}

/**
 * Get KPI summary for dashboard
 */
function getKPISummary() {
    const metrics = getAllMetrics();
    
    return {
        kpis: [
            {
                id: 'provenance_integrity',
                name: 'Provenance Integrity',
                value: metrics.provenance.integrityPercentage,
                unit: '%',
                target: '≥99%',
                status: metrics.provenance.integrityPercentage >= 99 ? 'PASS' : 'FAIL',
                icon: '🔐'
            },
            {
                id: 'settlement_latency',
                name: 'Settlement Latency (p50)',
                value: metrics.latency.p50Ms,
                unit: 'ms',
                target: '<3000ms',
                status: metrics.latency.p50Ms < 3000 ? 'PASS' : 'FAIL',
                icon: '⚡'
            },
            {
                id: 'energy_accuracy',
                name: 'Energy Accuracy',
                value: metrics.accuracy.errorRatePercentage,
                unit: '%',
                target: '≤0.1%',
                status: metrics.accuracy.errorRatePercentage <= 0.1 ? 'PASS' : 'FAIL',
                icon: '📊'
            },
            {
                id: 'carbon_reduction',
                name: 'Carbon Reduction',
                value: Math.abs(metrics.carbon.netCarbonKg),
                unit: 'kg CO₂',
                target: 'Net Negative',
                status: metrics.carbon.netCarbonKg < 0 ? 'PASS' : 'WARN',
                icon: '🌱'
            },
            {
                id: 'renewable_share',
                name: 'Renewable Share',
                value: metrics.carbon.renewablePercentage,
                unit: '%',
                target: '>50%',
                status: metrics.carbon.renewablePercentage > 50 ? 'PASS' : 'WARN',
                icon: '☀️'
            },
            {
                id: 'cbdc_volume',
                name: 'CBDC Volume',
                value: metrics.cbdc.totalVolumeINR,
                unit: '₹',
                target: 'N/A',
                status: 'INFO',
                icon: '💰'
            }
        ],
        overallScore: calculateOverallScore(metrics),
        evaluationGrade: getEvaluationGrade(metrics),
        timestamp: new Date().toISOString()
    };
}

/**
 * Calculate overall compliance score
 */
function calculateOverallScore(metrics) {
    let score = 0;
    let maxScore = 100;

    // Provenance (30 points)
    if (metrics.provenance.integrityPercentage >= 99) score += 30;
    else if (metrics.provenance.integrityPercentage >= 95) score += 20;
    else score += 10;

    // Latency (25 points)
    if (metrics.latency.p50Ms < 3000) score += 25;
    else if (metrics.latency.p50Ms < 5000) score += 15;
    else score += 5;

    // Accuracy (25 points)
    if (metrics.accuracy.errorRatePercentage <= 0.1) score += 25;
    else if (metrics.accuracy.errorRatePercentage <= 0.5) score += 15;
    else score += 5;

    // Carbon (20 points)
    if (metrics.carbon.netCarbonKg < 0) score += 20;
    else if (metrics.carbon.renewablePercentage > 50) score += 15;
    else score += 10;

    return {
        score,
        maxScore,
        percentage: parseFloat(((score / maxScore) * 100).toFixed(1))
    };
}

/**
 * Get evaluation grade based on metrics
 */
function getEvaluationGrade(metrics) {
    const score = calculateOverallScore(metrics).percentage;
    
    if (score >= 90) return { grade: 'A+', label: 'Excellent', color: '#22c55e' };
    if (score >= 80) return { grade: 'A', label: 'Very Good', color: '#84cc16' };
    if (score >= 70) return { grade: 'B', label: 'Good', color: '#eab308' };
    if (score >= 60) return { grade: 'C', label: 'Satisfactory', color: '#f97316' };
    return { grade: 'D', label: 'Needs Improvement', color: '#ef4444' };
}

/**
 * Get hourly energy data for charts
 */
function getHourlyEnergyData() {
    const hours = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(hour.getHours() - i);
        
        // Simulate realistic campus energy patterns
        const hourOfDay = hour.getHours();
        let solarFactor = 0;
        let demandFactor = 0.5;
        
        // Solar production curve (bell curve during daylight)
        if (hourOfDay >= 6 && hourOfDay <= 18) {
            solarFactor = Math.sin((hourOfDay - 6) * Math.PI / 12);
        }
        
        // Demand curve (peaks during day, lower at night)
        if (hourOfDay >= 8 && hourOfDay <= 22) {
            demandFactor = 0.6 + 0.4 * Math.sin((hourOfDay - 8) * Math.PI / 14);
        } else {
            demandFactor = 0.3;
        }
        
        hours.push({
            hour: hour.toISOString(),
            label: hour.getHours().toString().padStart(2, '0') + ':00',
            solar: parseFloat((solarFactor * 45 * (0.8 + Math.random() * 0.4)).toFixed(2)),
            grid: parseFloat((demandFactor * 30 * (0.8 + Math.random() * 0.4)).toFixed(2)),
            demand: parseFloat(((solarFactor * 45 + demandFactor * 30) * (0.9 + Math.random() * 0.2)).toFixed(2))
        });
    }
    
    return hours;
}

/**
 * Get settlement flow diagram data
 */
function getSettlementFlowData() {
    return {
        nodes: [
            { id: 'meter', label: 'Smart Meter', type: 'source', x: 50, y: 150 },
            { id: 'edge', label: 'Edge SDK', type: 'process', x: 150, y: 150 },
            { id: 'blockchain', label: 'Blockchain', type: 'storage', x: 250, y: 150 },
            { id: 'policy', label: 'Policy Engine', type: 'process', x: 350, y: 100 },
            { id: 'cbdc', label: 'CBDC Rails', type: 'process', x: 350, y: 200 },
            { id: 'consumer', label: 'Consumer e₹-R', type: 'wallet', x: 450, y: 100 },
            { id: 'treasury', label: 'Treasury e₹-W', type: 'wallet', x: 450, y: 200 }
        ],
        edges: [
            { from: 'meter', to: 'edge', label: 'IS-15959 Frame' },
            { from: 'edge', to: 'blockchain', label: 'Signed Tx' },
            { from: 'blockchain', to: 'policy', label: 'GoO Token' },
            { from: 'blockchain', to: 'cbdc', label: 'Trade Event' },
            { from: 'policy', to: 'consumer', label: 'Tariff' },
            { from: 'cbdc', to: 'consumer', label: 'Debit' },
            { from: 'cbdc', to: 'treasury', label: 'Credit' }
        ],
        stats: {
            avgFlowTimeMs: 912,
            txPerMinute: 0.75,
            activeFlows: 0
        }
    };
}

/**
 * Get campus map data with energy assets
 */
function getCampusMapData() {
    return {
        assets: [
            { id: 'solar_1', type: 'SOLAR', name: 'Main Building Rooftop', lat: 31.3955, lng: 75.5350, capacity: 100, currentOutput: 67.3, status: 'ACTIVE' },
            { id: 'solar_2', type: 'SOLAR', name: 'Library Solar Array', lat: 31.3962, lng: 75.5345, capacity: 50, currentOutput: 31.2, status: 'ACTIVE' },
            { id: 'ev_1', type: 'EV_CHARGER', name: 'EV Station Block-A', lat: 31.3948, lng: 75.5355, capacity: 22, currentDraw: 14.5, status: 'ACTIVE' },
            { id: 'ev_2', type: 'EV_CHARGER', name: 'EV Station Sports Complex', lat: 31.3940, lng: 75.5340, capacity: 22, currentDraw: 0, status: 'IDLE' },
            { id: 'battery_1', type: 'BATTERY', name: 'Energy Storage Unit', lat: 31.3950, lng: 75.5348, capacity: 200, soc: 73, status: 'CHARGING' },
            { id: 'grid_1', type: 'GRID', name: 'PSPCL Substation', lat: 31.3945, lng: 75.5360, capacity: 500, currentDraw: 132.6, status: 'ACTIVE' },
            { id: 'load_1', type: 'LOAD', name: 'Mega Hostel', lat: 31.3958, lng: 75.5365, avgDemand: 85, currentDemand: 92.3, status: 'HIGH' },
            { id: 'load_2', type: 'LOAD', name: 'Research Labs', lat: 31.3965, lng: 75.5350, avgDemand: 45, currentDemand: 38.7, status: 'NORMAL' }
        ],
        bounds: {
            north: 31.3975,
            south: 31.3935,
            east: 75.5375,
            west: 75.5330
        },
        center: { lat: 31.3955, lng: 75.5350 }
    };
}

/**
 * Express handler for metrics API
 */
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { type } = req.query;

    try {
        let response;

        switch (type) {
            case 'kpi':
                response = getKPISummary();
                break;
            case 'hourly':
                response = { data: getHourlyEnergyData() };
                break;
            case 'flow':
                response = getSettlementFlowData();
                break;
            case 'map':
                response = getCampusMapData();
                break;
            case 'all':
            default:
                response = {
                    metrics: getAllMetrics(),
                    kpis: getKPISummary(),
                    hourly: getHourlyEnergyData(),
                    flow: getSettlementFlowData(),
                    map: getCampusMapData()
                };
        }

        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            ...response
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Export functions for testing
module.exports.getAllMetrics = getAllMetrics;
module.exports.getKPISummary = getKPISummary;
module.exports.getHourlyEnergyData = getHourlyEnergyData;
module.exports.getSettlementFlowData = getSettlementFlowData;
module.exports.getCampusMapData = getCampusMapData;

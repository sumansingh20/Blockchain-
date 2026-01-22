/**
 * Carbon Tag Manager
 * Tracks carbon emissions and renewable energy certificates
 * 
 * @module services/policy/CarbonManager
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const config = require('../../config');
const { generateId } = require('../../utils/helpers');

/**
 * Carbon intensity factors (kg CO2 per kWh)
 */
const CARBON_FACTORS = Object.freeze({
    GRID: {
        co2PerKwh: config.energy.carbon.gridIntensity,
        renewable: false,
        recEligible: false,
        description: 'Coal/thermal grid power'
    },
    SOLAR: {
        co2PerKwh: config.energy.carbon.solarIntensity,
        renewable: true,
        recEligible: true,
        description: 'Solar photovoltaic'
    },
    HYBRID: {
        co2PerKwh: config.energy.carbon.hybridIntensity,
        renewable: false,
        recEligible: false,
        description: 'Mixed sources'
    },
    WIND: {
        co2PerKwh: 0.01,
        renewable: true,
        recEligible: true,
        description: 'Wind power'
    },
    HYDRO: {
        co2PerKwh: 0.02,
        renewable: true,
        recEligible: true,
        description: 'Hydroelectric'
    }
});

/**
 * Carbon Tag Manager
 * Calculates emissions, tracks certificates, and manages carbon accounting
 */
class CarbonManager {
    constructor() {
        this.factors = { ...CARBON_FACTORS };
        this.carbonPrice = config.energy.carbon.pricePerKg;
        
        this.ledger = {
            totalEmissions: 0,
            totalAvoided: 0,
            bySource: {},
            certificates: []
        };

        this.trades = [];
    }

    /**
     * Calculate carbon metrics for a trade
     * @param {number} kWh - Energy amount
     * @param {string} sourceTag - Source type tag
     * @param {string} baselineTag - Baseline for comparison
     * @returns {object} Carbon calculation
     */
    calculate(kWh, sourceTag, baselineTag = 'GRID') {
        const source = this.factors[sourceTag] || this.factors.GRID;
        const baseline = this.factors[baselineTag] || this.factors.GRID;

        const emissions = kWh * source.co2PerKwh;
        const baselineEmissions = kWh * baseline.co2PerKwh;
        const avoided = baselineEmissions - emissions;

        const carbonCost = emissions * this.carbonPrice;
        const carbonCredit = avoided > 0 ? avoided * this.carbonPrice : 0;

        let certificate = null;
        if (source.recEligible && kWh >= 1) {
            certificate = this._generateCertificate(kWh, sourceTag);
        }

        const result = {
            calculationId: generateId('CRB'),
            timestamp: new Date().toISOString(),
            input: { kWh, sourceTag, baselineTag },
            source: {
                type: sourceTag,
                factor: source.co2PerKwh,
                renewable: source.renewable,
                recEligible: source.recEligible
            },
            emissions: {
                actual: parseFloat(emissions.toFixed(4)),
                baseline: parseFloat(baselineEmissions.toFixed(4)),
                avoided: parseFloat(avoided.toFixed(4))
            },
            financial: {
                carbonCost: parseFloat(carbonCost.toFixed(2)),
                carbonCredit: parseFloat(carbonCredit.toFixed(2)),
                netCarbon: parseFloat((carbonCredit - carbonCost).toFixed(2))
            },
            certificate
        };

        this._updateLedger(result);
        this.trades.push(result);

        return result;
    }

    /**
     * Generate renewable energy certificate
     * @private
     */
    _generateCertificate(kWh, sourceTag) {
        const cert = {
            certificateId: `REC-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            type: 'REC',
            sourceType: sourceTag,
            energyKwh: parseFloat(kWh.toFixed(3)),
            co2AvoidedKg: parseFloat((kWh * (CARBON_FACTORS.GRID.co2PerKwh - (this.factors[sourceTag]?.co2PerKwh || 0))).toFixed(4)),
            issuedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'ACTIVE',
            registry: 'NITJ-CAMPUS-REC'
        };

        this.ledger.certificates.push(cert);
        return cert;
    }

    /**
     * Update carbon ledger
     * @private
     */
    _updateLedger(result) {
        this.ledger.totalEmissions += result.emissions.actual;
        this.ledger.totalAvoided += Math.max(0, result.emissions.avoided);

        if (!this.ledger.bySource[result.input.sourceTag]) {
            this.ledger.bySource[result.input.sourceTag] = {
                kWh: 0,
                emissions: 0,
                count: 0
            };
        }

        const src = this.ledger.bySource[result.input.sourceTag];
        src.kWh += result.input.kWh;
        src.emissions += result.emissions.actual;
        src.count++;
    }

    /**
     * Get certificate by ID
     * @param {string} certId - Certificate ID
     * @returns {object|null} Certificate
     */
    getCertificate(certId) {
        return this.ledger.certificates.find(c => c.certificateId === certId) || null;
    }

    /**
     * Get all active certificates
     * @returns {object[]} Active certificates
     */
    getActiveCertificates() {
        const now = new Date();
        return this.ledger.certificates.filter(c => 
            c.status === 'ACTIVE' && new Date(c.validUntil) > now
        );
    }

    /**
     * Retire a certificate
     * @param {string} certId - Certificate ID
     * @param {string} reason - Retirement reason
     * @returns {boolean} Success
     */
    retireCertificate(certId, reason = 'Used for offsetting') {
        const cert = this.ledger.certificates.find(c => c.certificateId === certId);
        if (!cert || cert.status !== 'ACTIVE') return false;

        cert.status = 'RETIRED';
        cert.retiredAt = new Date().toISOString();
        cert.retirementReason = reason;
        return true;
    }

    /**
     * Get carbon summary
     * @returns {object} Ledger summary
     */
    getSummary() {
        const totalKwh = Object.values(this.ledger.bySource)
            .reduce((sum, src) => sum + src.kWh, 0);

        const renewableKwh = Object.entries(this.ledger.bySource)
            .filter(([tag]) => this.factors[tag]?.renewable)
            .reduce((sum, [, src]) => sum + src.kWh, 0);

        return {
            totalEmissionsKg: parseFloat(this.ledger.totalEmissions.toFixed(2)),
            totalAvoidedKg: parseFloat(this.ledger.totalAvoided.toFixed(2)),
            netEmissionsKg: parseFloat((this.ledger.totalEmissions - this.ledger.totalAvoided).toFixed(2)),
            totalEnergyKwh: parseFloat(totalKwh.toFixed(2)),
            renewableEnergyKwh: parseFloat(renewableKwh.toFixed(2)),
            renewablePercent: totalKwh > 0 
                ? parseFloat(((renewableKwh / totalKwh) * 100).toFixed(1))
                : 0,
            certificatesIssued: this.ledger.certificates.length,
            certificatesActive: this.getActiveCertificates().length,
            bySource: { ...this.ledger.bySource },
            carbonIntensity: totalKwh > 0
                ? parseFloat((this.ledger.totalEmissions / totalKwh).toFixed(4))
                : 0
        };
    }

    /**
     * Get carbon factors reference
     * @returns {object} Carbon factors
     */
    getFactors() {
        return { ...this.factors };
    }

    /**
     * Update carbon price
     * @param {number} pricePerKg - New price
     */
    setCarbonPrice(pricePerKg) {
        this.carbonPrice = pricePerKg;
    }
}

module.exports = CarbonManager;
module.exports.CARBON_FACTORS = CARBON_FACTORS;

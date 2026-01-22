/**
 * Policy Service Index
 * Export policy-related modules
 * 
 * @module services/policy
 * @author NIT Jalandhar Energy Research Team
 */

'use strict';

const TariffManager = require('./TariffManager');
const CarbonManager = require('./CarbonManager');
const PolicyEngine = require('./PolicyEngine');

module.exports = {
    TariffManager,
    CarbonManager,
    PolicyEngine,
    PERIODS: TariffManager.PERIODS,
    CARBON_FACTORS: CarbonManager.CARBON_FACTORS
};

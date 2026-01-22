/**
 * Blockchain Service Exports
 * @module services/blockchain
 */

'use strict';

const { ContractManager, TX_STATUS, CONTRACT_EVENTS } = require('./ContractManager');

module.exports = {
    ContractManager,
    TX_STATUS,
    CONTRACT_EVENTS
};

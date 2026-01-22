/**
 * Ed25519 Cryptographic Signer
 * Implements RFC 8032 for meter data authentication
 * 
 * @module core/crypto/Ed25519Signer
 * @author NIT Jalandhar Energy Research Team
 * @see https://tools.ietf.org/html/rfc8032
 */

'use strict';

const crypto = require('crypto');
const { MeterError, ValidationError } = require('../../utils/errors');
const { generateId } = require('../../utils/helpers');

/**
 * Ed25519 Digital Signature Implementation
 * Provides key generation, signing, and verification for meter authentication
 */
class Ed25519Signer {
    constructor() {
        this.keyPairs = new Map();
        this.keyMetadata = new Map();
    }

    /**
     * Generate new Ed25519 key pair for a meter
     * @param {string} meterId - Unique meter identifier
     * @param {object} metadata - Optional metadata
     * @returns {object} Public key info (private key stored internally)
     */
    generateKeyPair(meterId, metadata = {}) {
        if (!meterId || typeof meterId !== 'string') {
            throw new ValidationError('Valid meter ID required', ['meterId']);
        }

        const keyPair = crypto.generateKeyPairSync('ed25519', {
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        const keyInfo = {
            meterId,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            fingerprint: this._generateFingerprint(keyPair.publicKey),
            createdAt: new Date().toISOString(),
            algorithm: 'Ed25519',
            keySize: 256
        };

        this.keyPairs.set(meterId, keyInfo);
        this.keyMetadata.set(meterId, {
            ...metadata,
            signaturesGenerated: 0,
            lastUsed: null
        });

        return {
            meterId,
            publicKey: keyPair.publicKey,
            fingerprint: keyInfo.fingerprint,
            algorithm: keyInfo.algorithm
        };
    }

    /**
     * Generate public key fingerprint
     * @private
     */
    _generateFingerprint(publicKey) {
        return crypto.createHash('sha256')
            .update(publicKey)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Sign payload using meter's private key
     * @param {string} meterId - Meter identifier
     * @param {object|string} payload - Data to sign
     * @returns {object} Signed payload with signature and metadata
     */
    sign(meterId, payload) {
        const keyInfo = this.keyPairs.get(meterId);
        if (!keyInfo) {
            throw new MeterError(`No key pair registered for meter: ${meterId}`, meterId);
        }

        const payloadString = typeof payload === 'string' 
            ? payload 
            : JSON.stringify(payload, Object.keys(payload).sort());

        const privateKey = crypto.createPrivateKey(keyInfo.privateKey);
        const signature = crypto.sign(null, Buffer.from(payloadString), privateKey);

        const meta = this.keyMetadata.get(meterId);
        meta.signaturesGenerated++;
        meta.lastUsed = new Date().toISOString();

        return {
            payload: typeof payload === 'string' ? payload : { ...payload },
            signature: signature.toString('base64'),
            signedAt: new Date().toISOString(),
            signatureId: generateId('SIG'),
            algorithm: 'Ed25519',
            keyFingerprint: keyInfo.fingerprint
        };
    }

    /**
     * Verify signature authenticity
     * @param {string} meterId - Meter identifier
     * @param {object} signedPayload - Signed payload object
     * @returns {object} Verification result
     */
    verify(meterId, signedPayload) {
        const keyInfo = this.keyPairs.get(meterId);
        if (!keyInfo) {
            return { 
                valid: false, 
                error: 'UNKNOWN_METER',
                message: `No key pair found for meter: ${meterId}` 
            };
        }

        try {
            const { payload, signature } = signedPayload;
            const payloadString = typeof payload === 'string'
                ? payload
                : JSON.stringify(payload, Object.keys(payload).sort());

            const publicKey = crypto.createPublicKey(keyInfo.publicKey);
            const signatureBuffer = Buffer.from(signature, 'base64');
            const isValid = crypto.verify(null, Buffer.from(payloadString), publicKey, signatureBuffer);

            return {
                valid: isValid,
                verifiedAt: new Date().toISOString(),
                meterId,
                keyFingerprint: keyInfo.fingerprint
            };
        } catch (error) {
            return {
                valid: false,
                error: 'VERIFICATION_FAILED',
                message: error.message
            };
        }
    }

    /**
     * Check if meter has registered keys
     * @param {string} meterId - Meter identifier
     * @returns {boolean} True if meter is registered
     */
    hasMeter(meterId) {
        return this.keyPairs.has(meterId);
    }

    /**
     * Get public key for a meter
     * @param {string} meterId - Meter identifier
     * @returns {string|null} PEM-encoded public key
     */
    getPublicKey(meterId) {
        const keyInfo = this.keyPairs.get(meterId);
        return keyInfo ? keyInfo.publicKey : null;
    }

    /**
     * Get key metadata
     * @param {string} meterId - Meter identifier
     * @returns {object|null} Key metadata
     */
    getMetadata(meterId) {
        const keyInfo = this.keyPairs.get(meterId);
        const meta = this.keyMetadata.get(meterId);
        
        if (!keyInfo) return null;

        return {
            meterId,
            fingerprint: keyInfo.fingerprint,
            algorithm: keyInfo.algorithm,
            createdAt: keyInfo.createdAt,
            ...meta
        };
    }

    /**
     * Revoke meter keys
     * @param {string} meterId - Meter identifier
     * @returns {boolean} True if revoked
     */
    revokeKeys(meterId) {
        const existed = this.keyPairs.has(meterId);
        this.keyPairs.delete(meterId);
        this.keyMetadata.delete(meterId);
        return existed;
    }

    /**
     * Get all registered meter IDs
     * @returns {string[]} Array of meter IDs
     */
    getRegisteredMeters() {
        return Array.from(this.keyPairs.keys());
    }

    /**
     * Export public keys for all meters
     * @returns {object[]} Array of public key objects
     */
    exportPublicKeys() {
        const keys = [];
        for (const [meterId, keyInfo] of this.keyPairs) {
            keys.push({
                meterId,
                publicKey: keyInfo.publicKey,
                fingerprint: keyInfo.fingerprint,
                algorithm: keyInfo.algorithm
            });
        }
        return keys;
    }

    /**
     * Get statistics
     * @returns {object} Signer statistics
     */
    getStats() {
        let totalSignatures = 0;
        for (const meta of this.keyMetadata.values()) {
            totalSignatures += meta.signaturesGenerated;
        }

        return {
            registeredMeters: this.keyPairs.size,
            totalSignaturesGenerated: totalSignatures,
            algorithm: 'Ed25519',
            keySize: 256
        };
    }
}

module.exports = Ed25519Signer;

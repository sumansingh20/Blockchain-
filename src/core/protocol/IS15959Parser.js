/**
 * IS-15959:2011 Protocol Parser
 * Indian Standard for electricity metering data exchange
 * 
 * @module core/protocol/IS15959Parser
 * @author NIT Jalandhar Energy Research Team
 * @see https://www.bis.gov.in/index.php/standards/technical-department/
 */

'use strict';

const crypto = require('crypto');
const { ValidationError } = require('../../utils/errors');

/**
 * OBIS (Object Identification System) code definitions
 * Format: A-B:C.D.E*F where each group has specific meaning
 */
const OBIS_CODES = Object.freeze({
    ACTIVE_ENERGY_IMPORT: '1.0.1.8.0',
    ACTIVE_ENERGY_EXPORT: '1.0.2.8.0',
    REACTIVE_ENERGY_IMPORT: '1.0.3.8.0',
    REACTIVE_ENERGY_EXPORT: '1.0.4.8.0',
    VOLTAGE_L1: '1.0.32.7.0',
    VOLTAGE_L2: '1.0.52.7.0',
    VOLTAGE_L3: '1.0.72.7.0',
    CURRENT_L1: '1.0.31.7.0',
    CURRENT_L2: '1.0.51.7.0',
    CURRENT_L3: '1.0.71.7.0',
    POWER_FACTOR: '1.0.13.7.0',
    FREQUENCY: '1.0.14.7.0',
    APPARENT_POWER: '1.0.9.7.0',
    ACTIVE_POWER: '1.0.1.7.0',
    METER_SERIAL: '0.0.96.1.0',
    TIMESTAMP: '0.0.1.0.0'
});

/**
 * Frame delimiters per IS-15959
 */
const FRAME_CONSTANTS = Object.freeze({
    HEADER: 0x7E,
    FOOTER: 0x7E,
    ESCAPE: 0x7D,
    XOR_VALUE: 0x20
});

/**
 * IS-15959:2011 Protocol Parser
 * Parses and generates compliant meter data frames
 */
class IS15959Parser {
    constructor() {
        this.frameCounter = 0;
        this.crcTable = this._generateCRCTable();
    }

    /**
     * Generate CRC-16 CCITT lookup table
     * @private
     */
    _generateCRCTable() {
        const table = new Uint16Array(256);
        const polynomial = 0x1021;

        for (let i = 0; i < 256; i++) {
            let crc = i << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc << 1) ^ ((crc & 0x8000) ? polynomial : 0);
            }
            table[i] = crc & 0xFFFF;
        }
        return table;
    }

    /**
     * Calculate CRC-16 CCITT checksum
     * @param {Buffer|Uint8Array} data - Data to checksum
     * @returns {number} CRC-16 value
     */
    calculateCRC16(data) {
        let crc = 0xFFFF;
        for (const byte of data) {
            const index = ((crc >> 8) ^ byte) & 0xFF;
            crc = (crc << 8) ^ this.crcTable[index];
        }
        return crc & 0xFFFF;
    }

    /**
     * Parse raw meter frame
     * @param {Buffer} rawFrame - Raw frame bytes
     * @returns {object} Parsed frame data
     */
    parseFrame(rawFrame) {
        if (!Buffer.isBuffer(rawFrame) && !(rawFrame instanceof Uint8Array)) {
            throw new ValidationError('Frame must be a Buffer or Uint8Array');
        }

        if (rawFrame.length < 12) {
            throw new ValidationError('Frame too short', ['frameLength']);
        }

        if (rawFrame[0] !== FRAME_CONSTANTS.HEADER || 
            rawFrame[rawFrame.length - 1] !== FRAME_CONSTANTS.FOOTER) {
            throw new ValidationError('Invalid frame delimiters', ['header', 'footer']);
        }

        const frameType = rawFrame[1];
        const segmentControl = rawFrame[2];
        const length = (rawFrame[3] << 8) | rawFrame[4];
        
        const payload = rawFrame.slice(5, rawFrame.length - 3);
        const receivedCrc = (rawFrame[rawFrame.length - 3] << 8) | rawFrame[rawFrame.length - 2];
        const calculatedCrc = this.calculateCRC16(rawFrame.slice(1, rawFrame.length - 3));

        if (receivedCrc !== calculatedCrc) {
            throw new ValidationError('CRC checksum mismatch', ['checksum']);
        }

        return {
            frameType,
            segmentControl,
            length,
            payload: this._parsePayload(payload),
            crc: receivedCrc,
            valid: true
        };
    }

    /**
     * Parse frame payload (APDU)
     * @private
     */
    _parsePayload(payload) {
        const dataValues = [];
        let offset = 0;

        while (offset < payload.length - 4) {
            const obisCode = this._readOBISCode(payload, offset);
            offset += 6;

            if (offset >= payload.length) break;

            const dataType = payload[offset];
            offset += 1;

            const { value, bytesRead } = this._readValue(payload, offset, dataType);
            offset += bytesRead;

            dataValues.push({
                obis: obisCode,
                type: dataType,
                value
            });
        }

        return { dataValues };
    }

    /**
     * Read OBIS code from buffer
     * @private
     */
    _readOBISCode(buffer, offset) {
        const parts = [];
        for (let i = 0; i < 6; i++) {
            parts.push(buffer[offset + i]);
        }
        return `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}.${parts[4]}`;
    }

    /**
     * Read value based on data type
     * @private
     */
    _readValue(buffer, offset, dataType) {
        switch (dataType) {
            case 0x12: // Unsigned 16-bit
                return { 
                    value: (buffer[offset] << 8) | buffer[offset + 1], 
                    bytesRead: 2 
                };
            case 0x06: // Unsigned 32-bit
                return { 
                    value: (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                           (buffer[offset + 2] << 8) | buffer[offset + 3], 
                    bytesRead: 4 
                };
            case 0x17: // Float 32-bit
                const floatBuf = Buffer.from([
                    buffer[offset], buffer[offset + 1], 
                    buffer[offset + 2], buffer[offset + 3]
                ]);
                return { value: floatBuf.readFloatBE(0), bytesRead: 4 };
            default:
                return { value: buffer[offset], bytesRead: 1 };
        }
    }

    /**
     * Generate IS-15959 compliant data frame
     * @param {object} meterData - Meter reading data
     * @returns {object} Frame structure with metadata
     */
    generateFrame(meterData) {
        const { meterId, kWh, voltage, current, powerFactor, frequency, timestamp } = meterData;

        this.frameCounter++;
        const frameId = `FR-${Date.now()}-${this.frameCounter.toString(16).padStart(4, '0')}`;

        const apdu = this._buildAPDU({
            [OBIS_CODES.ACTIVE_ENERGY_IMPORT]: { value: kWh, unit: 'kWh' },
            [OBIS_CODES.VOLTAGE_L1]: { value: voltage || 230, unit: 'V' },
            [OBIS_CODES.CURRENT_L1]: { value: current || 10, unit: 'A' },
            [OBIS_CODES.POWER_FACTOR]: { value: powerFactor || 0.95, unit: '' },
            [OBIS_CODES.FREQUENCY]: { value: frequency || 50, unit: 'Hz' }
        });

        const frame = {
            frameId,
            header: FRAME_CONSTANTS.HEADER,
            frameType: 0x03,
            segmentControl: 0x00,
            hdlcAddress: meterId,
            control: 0x13,
            llc: { destination: 0xE6, source: 0xE7, quality: 0x00 },
            apdu,
            timestamp: this._encodeTimestamp(timestamp || new Date()),
            footer: FRAME_CONSTANTS.FOOTER,
            metadata: {
                obisCode: OBIS_CODES.ACTIVE_ENERGY_IMPORT,
                generatedAt: new Date().toISOString(),
                protocol: 'IS-15959:2011',
                version: '1.0'
            }
        };

        frame.hcs = this._calculateHeaderChecksum(frame);
        frame.fcs = this._calculateFrameChecksum(frame);

        return frame;
    }

    /**
     * Build Application Protocol Data Unit
     * @private
     */
    _buildAPDU(dataValues) {
        const values = Object.entries(dataValues).map(([obis, data]) => ({
            obis,
            value: data.value,
            unit: data.unit,
            dataType: this._inferDataType(data.value)
        }));

        return {
            tag: 0xC4,
            invokeId: crypto.randomBytes(4).toString('hex'),
            notificationBody: { dataValues: values }
        };
    }

    /**
     * Infer data type from value
     * @private
     */
    _inferDataType(value) {
        if (Number.isInteger(value)) {
            return value > 65535 ? 'uint32' : 'uint16';
        }
        return 'float32';
    }

    /**
     * Encode timestamp per IS-15959 format
     * @private
     */
    _encodeTimestamp(date) {
        const d = date instanceof Date ? date : new Date(date);
        return {
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            day: d.getDate(),
            dayOfWeek: d.getDay(),
            hour: d.getHours(),
            minute: d.getMinutes(),
            second: d.getSeconds(),
            hundredths: Math.floor(d.getMilliseconds() / 10),
            deviation: Math.floor(d.getTimezoneOffset()),
            clockStatus: 0x00
        };
    }

    /**
     * Calculate header checksum
     * @private
     */
    _calculateHeaderChecksum(frame) {
        const headerData = [
            frame.frameType,
            frame.segmentControl,
            ...this._stringToBytes(frame.hdlcAddress),
            frame.control
        ];
        return this.calculateCRC16(Buffer.from(headerData));
    }

    /**
     * Calculate full frame checksum
     * @private
     */
    _calculateFrameChecksum(frame) {
        const data = JSON.stringify({
            hdlcAddress: frame.hdlcAddress,
            apdu: frame.apdu,
            timestamp: frame.timestamp
        });
        return this.calculateCRC16(Buffer.from(data));
    }

    /**
     * Convert string to byte array
     * @private
     */
    _stringToBytes(str) {
        return Array.from(Buffer.from(str, 'utf8'));
    }

    /**
     * Get OBIS codes reference
     */
    static getOBISCodes() {
        return { ...OBIS_CODES };
    }
}

module.exports = IS15959Parser;

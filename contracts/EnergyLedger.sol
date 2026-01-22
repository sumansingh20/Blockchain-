// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EnergyLedger
 * @author NIT Jalandhar - Campus Energy Trade System
 * @notice Smart contract for tokenized campus energy trading with blockchain provenance
 * @dev Implements energy receipt recording, token minting, and CBDC settlement tracking
 * 
 * @custom:security-contact security@nitj.ac.in
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract EnergyLedger is Ownable, ReentrancyGuard, Pausable {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    string public constant VERSION = "2.0.0";
    string public constant INSTITUTION = "Dr B R Ambedkar NIT Jalandhar";
    uint256 public constant MAX_KWH_SCALED = 10_000_000;  // 10,000 kWh max
    uint256 public constant MIN_KWH_SCALED = 1;           // 0.001 kWh min
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TYPE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum CarbonTag { NORMAL, GREEN, RENEWABLE, CERTIFIED }
    enum SettlementStatus { PENDING, COMPLETED, FAILED, REVERSED }
    
    struct EnergyReceipt {
        string meterId;
        uint256 kWhScaled;
        uint256 timestamp;
        CarbonTag carbonTag;
        bytes32 dataHash;
        bytes signature;
        uint256 recordedAt;
        address recordedBy;
        bool isValid;
    }
    
    struct EnergyToken {
        uint256 receiptId;
        string tokenURI;
        uint256 mintedAt;
        address mintedBy;
        bool isBurned;
    }
    
    struct Settlement {
        uint256 receiptId;
        string paymentRef;
        uint256 amount;
        SettlementStatus status;
        uint256 settledAt;
        address settledBy;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    uint256 private _receiptCounter;
    uint256 private _tokenCounter;
    uint256 private _settlementCounter;
    
    mapping(uint256 => EnergyReceipt) private _receipts;
    mapping(uint256 => EnergyToken) private _tokens;
    mapping(uint256 => Settlement) private _settlements;
    mapping(uint256 => uint256) private _receiptToToken;
    mapping(uint256 => uint256) private _receiptToSettlement;
    mapping(bytes32 => uint256) private _dataHashToReceipt;
    mapping(string => uint256[]) private _meterReceipts;
    mapping(address => bool) private _authorizedRegistrars;
    
    uint256 public totalEnergyRecorded;
    uint256 public totalGreenEnergy;
    uint256 public totalSettlementValue;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event EnergyReceiptRecorded(
        uint256 indexed receiptId,
        string indexed meterId,
        uint256 kWhScaled,
        CarbonTag carbonTag,
        bytes32 dataHash,
        address recordedBy
    );
    
    event EnergyTokenMinted(
        uint256 indexed tokenId,
        uint256 indexed receiptId,
        string tokenURI,
        address mintedBy
    );
    
    event SettlementRecorded(
        uint256 indexed settlementId,
        uint256 indexed receiptId,
        string paymentRef,
        uint256 amount,
        address settledBy
    );
    
    event RegistrarUpdated(address indexed registrar, bool authorized);
    event ReceiptInvalidated(uint256 indexed receiptId, string reason);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyAuthorized() {
        require(
            _authorizedRegistrars[msg.sender] || msg.sender == owner(),
            "EnergyLedger: unauthorized"
        );
        _;
    }
    
    modifier validReceipt(uint256 receiptId) {
        require(receiptId > 0 && receiptId <= _receiptCounter, "EnergyLedger: invalid receipt");
        require(_receipts[receiptId].isValid, "EnergyLedger: receipt invalidated");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor() Ownable(msg.sender) {
        _authorizedRegistrars[msg.sender] = true;
        emit RegistrarUpdated(msg.sender, true);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function recordEnergyReceipt(
        string calldata meterId,
        uint256 kWhScaled,
        uint256 timestamp,
        uint8 carbonTag,
        bytes32 dataHash,
        bytes calldata signature
    ) external onlyAuthorized whenNotPaused nonReentrant returns (uint256) {
        require(bytes(meterId).length > 0, "EnergyLedger: empty meterId");
        require(kWhScaled >= MIN_KWH_SCALED && kWhScaled <= MAX_KWH_SCALED, "EnergyLedger: kWh out of range");
        require(timestamp > 0 && timestamp <= block.timestamp + 1 hours, "EnergyLedger: invalid timestamp");
        require(carbonTag <= uint8(CarbonTag.CERTIFIED), "EnergyLedger: invalid carbonTag");
        require(dataHash != bytes32(0), "EnergyLedger: empty dataHash");
        require(_dataHashToReceipt[dataHash] == 0, "EnergyLedger: duplicate data");
        
        uint256 receiptId = ++_receiptCounter;
        
        _receipts[receiptId] = EnergyReceipt({
            meterId: meterId,
            kWhScaled: kWhScaled,
            timestamp: timestamp,
            carbonTag: CarbonTag(carbonTag),
            dataHash: dataHash,
            signature: signature,
            recordedAt: block.timestamp,
            recordedBy: msg.sender,
            isValid: true
        });
        
        _dataHashToReceipt[dataHash] = receiptId;
        _meterReceipts[meterId].push(receiptId);
        totalEnergyRecorded += kWhScaled;
        
        if (carbonTag == uint8(CarbonTag.GREEN) || carbonTag == uint8(CarbonTag.RENEWABLE)) {
            totalGreenEnergy += kWhScaled;
        }
        
        emit EnergyReceiptRecorded(receiptId, meterId, kWhScaled, CarbonTag(carbonTag), dataHash, msg.sender);
        return receiptId;
    }
    
    function mintEnergyToken(
        uint256 receiptId,
        string calldata tokenURI
    ) external onlyAuthorized whenNotPaused nonReentrant validReceipt(receiptId) returns (uint256) {
        require(_receiptToToken[receiptId] == 0, "EnergyLedger: token exists");
        require(bytes(tokenURI).length > 0, "EnergyLedger: empty tokenURI");
        
        uint256 tokenId = ++_tokenCounter;
        
        _tokens[tokenId] = EnergyToken({
            receiptId: receiptId,
            tokenURI: tokenURI,
            mintedAt: block.timestamp,
            mintedBy: msg.sender,
            isBurned: false
        });
        
        _receiptToToken[receiptId] = tokenId;
        
        emit EnergyTokenMinted(tokenId, receiptId, tokenURI, msg.sender);
        return tokenId;
    }
    
    function recordSettlement(
        uint256 receiptId,
        string calldata paymentRef,
        uint256 amount
    ) external onlyAuthorized whenNotPaused nonReentrant validReceipt(receiptId) returns (uint256) {
        require(bytes(paymentRef).length > 0, "EnergyLedger: empty paymentRef");
        require(amount > 0, "EnergyLedger: zero amount");
        require(_receiptToSettlement[receiptId] == 0, "EnergyLedger: already settled");
        
        uint256 settlementId = ++_settlementCounter;
        
        _settlements[settlementId] = Settlement({
            receiptId: receiptId,
            paymentRef: paymentRef,
            amount: amount,
            status: SettlementStatus.COMPLETED,
            settledAt: block.timestamp,
            settledBy: msg.sender
        });
        
        _receiptToSettlement[receiptId] = settlementId;
        totalSettlementValue += amount;
        
        emit SettlementRecorded(settlementId, receiptId, paymentRef, amount, msg.sender);
        return settlementId;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setRegistrar(address registrar, bool authorized) external onlyOwner {
        require(registrar != address(0), "EnergyLedger: zero address");
        _authorizedRegistrars[registrar] = authorized;
        emit RegistrarUpdated(registrar, authorized);
    }
    
    function invalidateReceipt(uint256 receiptId, string calldata reason) external onlyOwner {
        require(receiptId > 0 && receiptId <= _receiptCounter, "EnergyLedger: invalid receipt");
        require(_receipts[receiptId].isValid, "EnergyLedger: already invalid");
        _receipts[receiptId].isValid = false;
        emit ReceiptInvalidated(receiptId, reason);
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function totalReceipts() external view returns (uint256) { return _receiptCounter; }
    function totalTokens() external view returns (uint256) { return _tokenCounter; }
    function totalSettlements() external view returns (uint256) { return _settlementCounter; }
    
    function getReceipt(uint256 receiptId) external view returns (
        string memory meterId, uint256 kWhScaled, uint256 timestamp,
        CarbonTag carbonTag, bytes32 dataHash, uint256 recordedAt, bool isValid
    ) {
        require(receiptId > 0 && receiptId <= _receiptCounter, "EnergyLedger: invalid receipt");
        EnergyReceipt storage r = _receipts[receiptId];
        return (r.meterId, r.kWhScaled, r.timestamp, r.carbonTag, r.dataHash, r.recordedAt, r.isValid);
    }
    
    function getToken(uint256 tokenId) external view returns (
        uint256 receiptId, string memory tokenURI, uint256 mintedAt, bool isBurned
    ) {
        require(tokenId > 0 && tokenId <= _tokenCounter, "EnergyLedger: invalid token");
        EnergyToken storage t = _tokens[tokenId];
        return (t.receiptId, t.tokenURI, t.mintedAt, t.isBurned);
    }
    
    function getSettlement(uint256 settlementId) external view returns (
        uint256 receiptId, string memory paymentRef, uint256 amount,
        SettlementStatus status, uint256 settledAt
    ) {
        require(settlementId > 0 && settlementId <= _settlementCounter, "EnergyLedger: invalid settlement");
        Settlement storage s = _settlements[settlementId];
        return (s.receiptId, s.paymentRef, s.amount, s.status, s.settledAt);
    }
    
    function getTokenForReceipt(uint256 receiptId) external view returns (uint256) {
        return _receiptToToken[receiptId];
    }
    
    function getSettlementForReceipt(uint256 receiptId) external view returns (uint256) {
        return _receiptToSettlement[receiptId];
    }
    
    function getReceiptsForMeter(string calldata meterId) external view returns (uint256[] memory) {
        return _meterReceipts[meterId];
    }
    
    function isAuthorizedRegistrar(address addr) external view returns (bool) {
        return _authorizedRegistrars[addr];
    }
    
    function getStatistics() external view returns (
        uint256 receipts, uint256 tokens, uint256 settlements,
        uint256 totalEnergy, uint256 greenEnergy, uint256 settlementValue
    ) {
        return (_receiptCounter, _tokenCounter, _settlementCounter,
                totalEnergyRecorded, totalGreenEnergy, totalSettlementValue);
    }
}

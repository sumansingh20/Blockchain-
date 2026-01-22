// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EnergyLedger
 * @dev Campus Energy Trading System with GoO/REC-style tokens
 * @notice This contract manages energy recording, tokenization, and settlement tracking
 * 
 * Key Features:
 * - Record verified smart meter energy data
 * - Mint non-transferable energy tokens (1 Token = 1 kWh)
 * - Track CBDC settlement references (payment happens off-chain)
 * - Immutable audit trail for all energy transactions
 */
contract EnergyLedger {
    
    // ============ State Variables ============
    
    address public owner;
    uint256 public receiptCounter;
    uint256 public tokenCounter;
    uint256 public settlementCounter;
    
    // ============ Enums ============
    
    enum CarbonTag { NORMAL, GREEN }
    enum TokenStatus { ACTIVE, BURNED }
    enum SettlementStatus { PENDING, COMPLETED, FAILED }
    
    // ============ Structs ============
    
    /**
     * @dev Energy receipt from smart meter
     */
    struct EnergyReceipt {
        uint256 receiptId;
        string meterId;
        uint256 kWh;              // Energy in kWh (scaled by 1000 for decimals)
        uint256 timestamp;
        CarbonTag carbonTag;
        bytes32 dataHash;         // Hash of original meter data for verification
        bool tokenized;
        uint256 recordedAt;
    }
    
    /**
     * @dev Energy token representing verified energy
     */
    struct EnergyToken {
        uint256 tokenId;
        uint256 receiptId;
        uint256 kWh;
        CarbonTag carbonTag;
        address holder;
        TokenStatus status;
        uint256 mintedAt;
        uint256 burnedAt;
    }
    
    /**
     * @dev Settlement record linking energy to CBDC payment
     */
    struct Settlement {
        uint256 settlementId;
        uint256 receiptId;
        uint256 tokenId;
        string paymentRef;        // CBDC transaction reference
        uint256 amountINR;        // Amount in paise (1 INR = 100 paise)
        SettlementStatus status;
        uint256 settledAt;
    }
    
    // ============ Mappings ============
    
    mapping(uint256 => EnergyReceipt) public receipts;
    mapping(uint256 => EnergyToken) public tokens;
    mapping(uint256 => Settlement) public settlements;
    mapping(string => uint256[]) public meterReceipts;      // meterId => receiptIds
    mapping(bytes32 => bool) public usedDataHashes;         // Replay attack prevention
    mapping(uint256 => uint256) public receiptToToken;      // receiptId => tokenId
    mapping(uint256 => uint256) public tokenToSettlement;   // tokenId => settlementId
    
    // ============ Events ============
    
    event EnergyRecorded(
        uint256 indexed receiptId,
        string meterId,
        uint256 kWh,
        CarbonTag carbonTag,
        uint256 timestamp
    );
    
    event TokenMinted(
        uint256 indexed tokenId,
        uint256 indexed receiptId,
        uint256 kWh,
        address holder
    );
    
    event TokenBurned(
        uint256 indexed tokenId,
        uint256 indexed receiptId,
        uint256 burnedAt
    );
    
    event SettlementRecorded(
        uint256 indexed settlementId,
        uint256 indexed receiptId,
        uint256 indexed tokenId,
        string paymentRef,
        uint256 amountINR
    );
    
    event SettlementStatusUpdated(
        uint256 indexed settlementId,
        SettlementStatus status
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "EnergyLedger: caller is not the owner");
        _;
    }
    
    modifier validReceipt(uint256 _receiptId) {
        require(_receiptId > 0 && _receiptId <= receiptCounter, "EnergyLedger: invalid receipt ID");
        _;
    }
    
    modifier validToken(uint256 _tokenId) {
        require(_tokenId > 0 && _tokenId <= tokenCounter, "EnergyLedger: invalid token ID");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        receiptCounter = 0;
        tokenCounter = 0;
        settlementCounter = 0;
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Record verified energy data from smart meter
     * @param _meterId Unique identifier of the smart meter
     * @param _kWh Energy amount in kWh (scaled by 1000, e.g., 5500 = 5.5 kWh)
     * @param _timestamp Unix timestamp of energy measurement
     * @param _carbonTag 0 for NORMAL, 1 for GREEN energy
     * @param _dataHash Hash of original meter data for integrity verification
     * @return receiptId The unique ID of the created receipt
     */
    function recordEnergy(
        string calldata _meterId,
        uint256 _kWh,
        uint256 _timestamp,
        uint8 _carbonTag,
        bytes32 _dataHash
    ) external onlyOwner returns (uint256) {
        // Validation
        require(bytes(_meterId).length > 0, "EnergyLedger: meter ID required");
        require(_kWh > 0, "EnergyLedger: kWh must be positive");
        require(_timestamp <= block.timestamp, "EnergyLedger: future timestamp not allowed");
        require(_carbonTag <= 1, "EnergyLedger: invalid carbon tag");
        require(!usedDataHashes[_dataHash], "EnergyLedger: duplicate data (replay attack prevented)");
        
        // Mark hash as used (replay prevention)
        usedDataHashes[_dataHash] = true;
        
        // Create receipt
        receiptCounter++;
        receipts[receiptCounter] = EnergyReceipt({
            receiptId: receiptCounter,
            meterId: _meterId,
            kWh: _kWh,
            timestamp: _timestamp,
            carbonTag: CarbonTag(_carbonTag),
            dataHash: _dataHash,
            tokenized: false,
            recordedAt: block.timestamp
        });
        
        // Track meter's receipts
        meterReceipts[_meterId].push(receiptCounter);
        
        emit EnergyRecorded(
            receiptCounter,
            _meterId,
            _kWh,
            CarbonTag(_carbonTag),
            _timestamp
        );
        
        return receiptCounter;
    }
    
    /**
     * @dev Mint energy token for a verified receipt (1 Token = 1 kWh)
     * @param _receiptId The receipt to tokenize
     * @return tokenId The unique ID of the minted token
     */
    function mintEnergyToken(uint256 _receiptId) 
        external 
        onlyOwner 
        validReceipt(_receiptId) 
        returns (uint256) 
    {
        EnergyReceipt storage receipt = receipts[_receiptId];
        
        require(!receipt.tokenized, "EnergyLedger: receipt already tokenized");
        
        // Create token
        tokenCounter++;
        tokens[tokenCounter] = EnergyToken({
            tokenId: tokenCounter,
            receiptId: _receiptId,
            kWh: receipt.kWh,
            carbonTag: receipt.carbonTag,
            holder: owner,              // Tokens are held by system (non-transferable)
            status: TokenStatus.ACTIVE,
            mintedAt: block.timestamp,
            burnedAt: 0
        });
        
        // Update receipt
        receipt.tokenized = true;
        receiptToToken[_receiptId] = tokenCounter;
        
        emit TokenMinted(tokenCounter, _receiptId, receipt.kWh, owner);
        
        return tokenCounter;
    }
    
    /**
     * @dev Burn energy token after settlement
     * @param _tokenId The token to burn
     */
    function burnEnergyToken(uint256 _tokenId) 
        external 
        onlyOwner 
        validToken(_tokenId) 
    {
        EnergyToken storage token = tokens[_tokenId];
        
        require(token.status == TokenStatus.ACTIVE, "EnergyLedger: token not active");
        
        token.status = TokenStatus.BURNED;
        token.burnedAt = block.timestamp;
        
        emit TokenBurned(_tokenId, token.receiptId, block.timestamp);
    }
    
    /**
     * @dev Record CBDC settlement reference (payment happens off-chain)
     * @param _receiptId Associated energy receipt
     * @param _tokenId Associated energy token
     * @param _paymentRef CBDC transaction reference
     * @param _amountINR Settlement amount in paise
     * @return settlementId The unique ID of the settlement record
     */
    function recordSettlement(
        uint256 _receiptId,
        uint256 _tokenId,
        string calldata _paymentRef,
        uint256 _amountINR
    ) 
        external 
        onlyOwner 
        validReceipt(_receiptId)
        validToken(_tokenId)
        returns (uint256) 
    {
        require(bytes(_paymentRef).length > 0, "EnergyLedger: payment reference required");
        require(_amountINR > 0, "EnergyLedger: amount must be positive");
        require(tokens[_tokenId].receiptId == _receiptId, "EnergyLedger: token-receipt mismatch");
        
        settlementCounter++;
        settlements[settlementCounter] = Settlement({
            settlementId: settlementCounter,
            receiptId: _receiptId,
            tokenId: _tokenId,
            paymentRef: _paymentRef,
            amountINR: _amountINR,
            status: SettlementStatus.COMPLETED,
            settledAt: block.timestamp
        });
        
        tokenToSettlement[_tokenId] = settlementCounter;
        
        emit SettlementRecorded(
            settlementCounter,
            _receiptId,
            _tokenId,
            _paymentRef,
            _amountINR
        );
        
        return settlementCounter;
    }
    
    /**
     * @dev Update settlement status (for failed/retry scenarios)
     * @param _settlementId Settlement to update
     * @param _status New status (0: PENDING, 1: COMPLETED, 2: FAILED)
     */
    function updateSettlementStatus(uint256 _settlementId, uint8 _status) 
        external 
        onlyOwner 
    {
        require(_settlementId > 0 && _settlementId <= settlementCounter, "EnergyLedger: invalid settlement ID");
        require(_status <= 2, "EnergyLedger: invalid status");
        
        settlements[_settlementId].status = SettlementStatus(_status);
        
        emit SettlementStatusUpdated(_settlementId, SettlementStatus(_status));
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get all receipt IDs for a meter
     */
    function getMeterReceipts(string calldata _meterId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return meterReceipts[_meterId];
    }
    
    /**
     * @dev Get receipt details
     */
    function getReceipt(uint256 _receiptId) 
        external 
        view 
        validReceipt(_receiptId)
        returns (
            string memory meterId,
            uint256 kWh,
            uint256 timestamp,
            CarbonTag carbonTag,
            bool tokenized
        ) 
    {
        EnergyReceipt storage r = receipts[_receiptId];
        return (r.meterId, r.kWh, r.timestamp, r.carbonTag, r.tokenized);
    }
    
    /**
     * @dev Get token details
     */
    function getToken(uint256 _tokenId) 
        external 
        view 
        validToken(_tokenId)
        returns (
            uint256 receiptId,
            uint256 kWh,
            CarbonTag carbonTag,
            TokenStatus status,
            uint256 mintedAt
        ) 
    {
        EnergyToken storage t = tokens[_tokenId];
        return (t.receiptId, t.kWh, t.carbonTag, t.status, t.mintedAt);
    }
    
    /**
     * @dev Get settlement details
     */
    function getSettlement(uint256 _settlementId) 
        external 
        view 
        returns (
            uint256 receiptId,
            uint256 tokenId,
            string memory paymentRef,
            uint256 amountINR,
            SettlementStatus status
        ) 
    {
        require(_settlementId > 0 && _settlementId <= settlementCounter, "EnergyLedger: invalid settlement ID");
        Settlement storage s = settlements[_settlementId];
        return (s.receiptId, s.tokenId, s.paymentRef, s.amountINR, s.status);
    }
    
    /**
     * @dev Get system statistics
     */
    function getStats() 
        external 
        view 
        returns (
            uint256 totalReceipts,
            uint256 totalTokens,
            uint256 totalSettlements
        ) 
    {
        return (receiptCounter, tokenCounter, settlementCounter);
    }
    
    /**
     * @dev Check if data hash has been used (for replay prevention check)
     */
    function isDataHashUsed(bytes32 _dataHash) external view returns (bool) {
        return usedDataHashes[_dataHash];
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "EnergyLedger: new owner is zero address");
        owner = _newOwner;
    }
}

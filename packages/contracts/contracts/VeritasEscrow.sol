// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ReputationEngine.sol";

/**
 * @title VeritasEscrow
 * @notice Secure escrow contract for peer-to-peer marketplace trades
 * @dev Handles fund locking, release, and dispute resolution
 * 
 * Trade Flow:
 * 1. Buyer creates trade → funds locked
 * 2. Seller delivers goods/services
 * 3. Buyer confirms delivery → funds released to seller
 * 4. Both parties rate each other → reputation updated
 * 
 * Dispute Flow:
 * 1. Either party raises dispute within dispute window
 * 2. Dispute resolver reviews evidence
 * 3. Funds released to winner
 */
contract VeritasEscrow is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Roles ============
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============ Enums ============
    enum TradeStatus {
        None,
        Created,           // Buyer created, funds locked
        SellerAccepted,    // Seller accepted the trade
        Delivered,         // Seller marked as delivered
        Completed,         // Buyer confirmed, funds released
        Disputed,          // Dispute raised
        Resolved,          // Dispute resolved
        Cancelled,         // Trade cancelled
        Expired            // Trade expired without completion
    }

    // ============ Structs ============
    struct Trade {
        bytes32 tradeId;
        address buyer;
        address seller;
        address paymentToken;         // ERC20 token (e.g., USDC)
        uint256 amount;               // Total trade amount
        uint256 platformFee;          // Platform fee amount
        uint256 createdAt;
        uint256 expiresAt;
        uint256 deliveredAt;
        uint256 completedAt;
        TradeStatus status;
        string itemDescription;
        string deliveryProof;         // IPFS hash or URL
        uint256 buyerRating;          // Rating given by buyer (0 if not rated)
        uint256 sellerRating;         // Rating given by seller (0 if not rated)
    }

    struct Dispute {
        bytes32 tradeId;
        address initiator;
        string reason;
        string buyerEvidence;         // IPFS hash
        string sellerEvidence;        // IPFS hash
        address winner;
        uint256 initiatedAt;
        uint256 resolvedAt;
        bool isResolved;
    }

    // ============ State Variables ============
    ReputationEngine public immutable reputationEngine;
    address public feeRecipient;
    
    uint256 public platformFeeRate = 250;      // 2.5% (basis points)
    uint256 public constant MAX_FEE_RATE = 1000; // 10% max
    uint256 public constant BASIS_POINTS = 10000;
    
    uint256 public defaultExpiryDuration = 7 days;
    uint256 public disputeWindow = 3 days;      // Time after delivery to raise dispute
    uint256 public autoReleaseDelay = 14 days;  // Auto-release if buyer doesn't confirm
    
    // Supported payment tokens
    mapping(address => bool) public supportedTokens;
    
    // Trade storage
    mapping(bytes32 => Trade) public trades;
    mapping(bytes32 => Dispute) public disputes;
    
    // User trade indices
    mapping(address => bytes32[]) public userTrades;
    
    // Trade counter for unique IDs
    uint256 private _tradeNonce;

    // ============ Events ============
    event TradeCreated(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address paymentToken,
        uint256 amount,
        uint256 expiresAt
    );
    
    event TradeAccepted(bytes32 indexed tradeId, address indexed seller);
    
    event TradeDelivered(
        bytes32 indexed tradeId,
        string deliveryProof
    );
    
    event TradeCompleted(
        bytes32 indexed tradeId,
        uint256 sellerAmount,
        uint256 platformFeeAmount
    );
    
    event TradeCancelled(bytes32 indexed tradeId, address indexed cancelledBy);
    
    event TradeExpired(bytes32 indexed tradeId);
    
    event DisputeRaised(
        bytes32 indexed tradeId,
        address indexed initiator,
        string reason
    );
    
    event EvidenceSubmitted(
        bytes32 indexed tradeId,
        address indexed submitter,
        string evidence
    );
    
    event DisputeResolved(
        bytes32 indexed tradeId,
        address indexed winner,
        uint256 amount
    );
    
    event TradeRated(
        bytes32 indexed tradeId,
        address indexed rater,
        address indexed rated,
        uint256 rating
    );
    
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event FeeUpdated(uint256 newFeeRate);

    // ============ Errors ============
    error InvalidTrade();
    error InvalidStatus();
    error Unauthorized();
    error InvalidRating();
    error TokenNotSupported();
    error InsufficientAmount();
    error DisputeWindowClosed();
    error AlreadyRated();
    error TradeNotExpired();

    // ============ Constructor ============
    constructor(
        address _reputationEngine,
        address _feeRecipient,
        address[] memory _initialTokens
    ) {
        reputationEngine = ReputationEngine(_reputationEngine);
        feeRecipient = _feeRecipient;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISPUTE_RESOLVER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Add initial supported tokens
        for (uint i = 0; i < _initialTokens.length; i++) {
            supportedTokens[_initialTokens[i]] = true;
            emit TokenAdded(_initialTokens[i]);
        }
    }

    // ============ Trade Creation ============

    /**
     * @notice Create a new trade with funds locked in escrow
     * @param seller The seller's address
     * @param paymentToken The ERC20 token for payment (e.g., USDC)
     * @param amount The total trade amount
     * @param itemDescription Description of the item/service
     * @param expiryDuration Custom expiry duration (0 for default)
     */
    function createTrade(
        address seller,
        address paymentToken,
        uint256 amount,
        string calldata itemDescription,
        uint256 expiryDuration
    ) external nonReentrant whenNotPaused returns (bytes32) {
        if (!supportedTokens[paymentToken]) revert TokenNotSupported();
        if (amount == 0) revert InsufficientAmount();
        if (seller == address(0) || seller == msg.sender) revert InvalidTrade();
        
        // Generate unique trade ID
        bytes32 tradeId = keccak256(
            abi.encodePacked(
                msg.sender,
                seller,
                block.timestamp,
                _tradeNonce++
            )
        );
        
        // Calculate fee
        uint256 fee = (amount * platformFeeRate) / BASIS_POINTS;
        uint256 expiry = block.timestamp + (expiryDuration > 0 ? expiryDuration : defaultExpiryDuration);
        
        // Create trade
        trades[tradeId] = Trade({
            tradeId: tradeId,
            buyer: msg.sender,
            seller: seller,
            paymentToken: paymentToken,
            amount: amount,
            platformFee: fee,
            createdAt: block.timestamp,
            expiresAt: expiry,
            deliveredAt: 0,
            completedAt: 0,
            status: TradeStatus.Created,
            itemDescription: itemDescription,
            deliveryProof: "",
            buyerRating: 0,
            sellerRating: 0
        });
        
        // Track user trades
        userTrades[msg.sender].push(tradeId);
        userTrades[seller].push(tradeId);
        
        // Transfer funds to escrow
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Register users in reputation system
        reputationEngine.registerUser(msg.sender);
        reputationEngine.registerUser(seller);
        
        emit TradeCreated(tradeId, msg.sender, seller, paymentToken, amount, expiry);
        
        return tradeId;
    }

    // ============ Trade Actions ============

    /**
     * @notice Seller accepts the trade
     */
    function acceptTrade(bytes32 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        if (trade.status != TradeStatus.Created) revert InvalidStatus();
        if (msg.sender != trade.seller) revert Unauthorized();
        if (block.timestamp > trade.expiresAt) revert InvalidTrade();
        
        trade.status = TradeStatus.SellerAccepted;
        
        emit TradeAccepted(tradeId, msg.sender);
    }

    /**
     * @notice Seller marks trade as delivered
     * @param deliveryProof IPFS hash or proof of delivery
     */
    function markDelivered(
        bytes32 tradeId,
        string calldata deliveryProof
    ) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        if (trade.status != TradeStatus.SellerAccepted) revert InvalidStatus();
        if (msg.sender != trade.seller) revert Unauthorized();
        
        trade.status = TradeStatus.Delivered;
        trade.deliveredAt = block.timestamp;
        trade.deliveryProof = deliveryProof;
        
        emit TradeDelivered(tradeId, deliveryProof);
    }

    /**
     * @notice Buyer confirms delivery and releases funds
     * @param sellerRating Rating for seller (100-500, representing 1.0-5.0)
     */
    function confirmDelivery(
        bytes32 tradeId,
        uint256 sellerRating
    ) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        if (trade.status != TradeStatus.Delivered) revert InvalidStatus();
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (sellerRating < 100 || sellerRating > 500) revert InvalidRating();
        
        trade.status = TradeStatus.Completed;
        trade.completedAt = block.timestamp;
        trade.buyerRating = sellerRating;
        
        // Calculate amounts
        uint256 sellerAmount = trade.amount - trade.platformFee;
        
        // Transfer funds
        IERC20(trade.paymentToken).safeTransfer(trade.seller, sellerAmount);
        IERC20(trade.paymentToken).safeTransfer(feeRecipient, trade.platformFee);
        
        emit TradeCompleted(tradeId, sellerAmount, trade.platformFee);
        emit TradeRated(tradeId, msg.sender, trade.seller, sellerRating);
    }

    /**
     * @notice Seller rates the buyer after trade completion
     */
    function rateBuyer(bytes32 tradeId, uint256 buyerRating) external {
        Trade storage trade = trades[tradeId];
        
        if (trade.status != TradeStatus.Completed) revert InvalidStatus();
        if (msg.sender != trade.seller) revert Unauthorized();
        if (buyerRating < 100 || buyerRating > 500) revert InvalidRating();
        if (trade.sellerRating != 0) revert AlreadyRated();
        
        trade.sellerRating = buyerRating;
        
        // Record trade in reputation engine once both ratings are in
        if (trade.buyerRating != 0) {
            reputationEngine.recordTrade(
                tradeId,
                trade.seller,
                trade.buyer,
                trade.amount,
                trade.buyerRating,
                trade.sellerRating
            );
        }
        
        emit TradeRated(tradeId, msg.sender, trade.buyer, buyerRating);
    }

    /**
     * @notice Cancel a trade (only before seller accepts)
     */
    function cancelTrade(bytes32 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        // Only buyer can cancel, and only before seller accepts
        if (msg.sender != trade.buyer) revert Unauthorized();
        if (trade.status != TradeStatus.Created) revert InvalidStatus();
        
        trade.status = TradeStatus.Cancelled;
        
        // Refund buyer
        IERC20(trade.paymentToken).safeTransfer(trade.buyer, trade.amount);
        
        emit TradeCancelled(tradeId, msg.sender);
    }

    /**
     * @notice Claim expired trade funds
     */
    function claimExpiredTrade(bytes32 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        if (trade.status != TradeStatus.Created && trade.status != TradeStatus.SellerAccepted) {
            revert InvalidStatus();
        }
        if (block.timestamp <= trade.expiresAt) revert TradeNotExpired();
        
        trade.status = TradeStatus.Expired;
        
        // Refund buyer
        IERC20(trade.paymentToken).safeTransfer(trade.buyer, trade.amount);
        
        emit TradeExpired(tradeId);
    }

    /**
     * @notice Auto-release funds if buyer doesn't confirm within delay
     */
    function autoRelease(bytes32 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        if (trade.status != TradeStatus.Delivered) revert InvalidStatus();
        if (block.timestamp < trade.deliveredAt + autoReleaseDelay) revert InvalidTrade();
        
        trade.status = TradeStatus.Completed;
        trade.completedAt = block.timestamp;
        trade.buyerRating = 500; // Default 5-star rating for auto-release
        
        uint256 sellerAmount = trade.amount - trade.platformFee;
        
        IERC20(trade.paymentToken).safeTransfer(trade.seller, sellerAmount);
        IERC20(trade.paymentToken).safeTransfer(feeRecipient, trade.platformFee);
        
        emit TradeCompleted(tradeId, sellerAmount, trade.platformFee);
    }

    // ============ Dispute Functions ============

    /**
     * @notice Raise a dispute on a trade
     */
    function raiseDispute(
        bytes32 tradeId,
        string calldata reason,
        string calldata evidence
    ) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        // Can dispute after delivered within dispute window
        if (trade.status != TradeStatus.Delivered) revert InvalidStatus();
        if (msg.sender != trade.buyer && msg.sender != trade.seller) revert Unauthorized();
        if (block.timestamp > trade.deliveredAt + disputeWindow) revert DisputeWindowClosed();
        
        trade.status = TradeStatus.Disputed;
        
        disputes[tradeId] = Dispute({
            tradeId: tradeId,
            initiator: msg.sender,
            reason: reason,
            buyerEvidence: msg.sender == trade.buyer ? evidence : "",
            sellerEvidence: msg.sender == trade.seller ? evidence : "",
            winner: address(0),
            initiatedAt: block.timestamp,
            resolvedAt: 0,
            isResolved: false
        });
        
        emit DisputeRaised(tradeId, msg.sender, reason);
        emit EvidenceSubmitted(tradeId, msg.sender, evidence);
    }

    /**
     * @notice Submit evidence for a dispute
     */
    function submitEvidence(
        bytes32 tradeId,
        string calldata evidence
    ) external {
        Trade storage trade = trades[tradeId];
        Dispute storage dispute = disputes[tradeId];
        
        if (trade.status != TradeStatus.Disputed) revert InvalidStatus();
        if (msg.sender != trade.buyer && msg.sender != trade.seller) revert Unauthorized();
        
        if (msg.sender == trade.buyer) {
            dispute.buyerEvidence = evidence;
        } else {
            dispute.sellerEvidence = evidence;
        }
        
        emit EvidenceSubmitted(tradeId, msg.sender, evidence);
    }

    /**
     * @notice Resolve a dispute
     * @dev Only callable by dispute resolver
     */
    function resolveDispute(
        bytes32 tradeId,
        address winner
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) nonReentrant {
        Trade storage trade = trades[tradeId];
        Dispute storage dispute = disputes[tradeId];
        
        if (trade.status != TradeStatus.Disputed) revert InvalidStatus();
        if (winner != trade.buyer && winner != trade.seller) revert InvalidTrade();
        
        trade.status = TradeStatus.Resolved;
        dispute.winner = winner;
        dispute.resolvedAt = block.timestamp;
        dispute.isResolved = true;
        
        // Transfer funds to winner
        uint256 winnerAmount = winner == trade.seller 
            ? trade.amount - trade.platformFee 
            : trade.amount;
        
        IERC20(trade.paymentToken).safeTransfer(winner, winnerAmount);
        
        // If seller won, still collect platform fee
        if (winner == trade.seller) {
            IERC20(trade.paymentToken).safeTransfer(feeRecipient, trade.platformFee);
        }
        
        // Record dispute resolution in reputation engine
        address loser = winner == trade.buyer ? trade.seller : trade.buyer;
        reputationEngine.recordDisputeResolution(tradeId, winner, loser);
        
        emit DisputeResolved(tradeId, winner, winnerAmount);
    }

    // ============ View Functions ============

    /**
     * @notice Get trade details
     */
    function getTrade(bytes32 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }

    /**
     * @notice Get dispute details
     */
    function getDispute(bytes32 tradeId) external view returns (Dispute memory) {
        return disputes[tradeId];
    }

    /**
     * @notice Get user's trade IDs
     */
    function getUserTrades(address user) external view returns (bytes32[] memory) {
        return userTrades[user];
    }

    /**
     * @notice Calculate platform fee for an amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * platformFeeRate) / BASIS_POINTS;
    }

    // ============ Admin Functions ============

    function addSupportedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }

    function removeSupportedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    function updateFeeRate(uint256 newFeeRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeRate <= MAX_FEE_RATE, "Fee too high");
        platformFeeRate = newFeeRate;
        emit FeeUpdated(newFeeRate);
    }

    function updateFeeRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRecipient = newRecipient;
    }

    function updateDisputeWindow(uint256 newWindow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        disputeWindow = newWindow;
    }

    function updateAutoReleaseDelay(uint256 newDelay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoReleaseDelay = newDelay;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VeritasSoulboundBadge.sol";

/**
 * @title ReputationEngine
 * @notice Tracks user reputation and automatically mints SBT badges
 * @dev Central reputation management for the Veritas Marketplace
 * 
 * Threshold Requirements:
 * - Bronze:   10+ trades, 4.00+ rating (400)
 * - Silver:   25+ trades, 4.50+ rating (450)
 * - Gold:     50+ trades, 4.80+ rating (480)
 * - Platinum: 100+ trades, 4.90+ rating (490)
 * - Diamond:  250+ trades, 4.95+ rating (495)
 */
contract ReputationEngine is AccessControl, ReentrancyGuard {
    
    // ============ Roles ============
    bytes32 public constant ESCROW_ROLE = keccak256("ESCROW_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");
    bytes32 public constant CROSS_CHAIN_ROLE = keccak256("CROSS_CHAIN_ROLE");

    // ============ Structs ============
    struct UserReputation {
        uint256 totalTrades;
        uint256 successfulTrades;
        uint256 disputesWon;
        uint256 disputesLost;
        uint256 totalRatingPoints;    // Sum of all ratings received
        uint256 ratingCount;          // Number of ratings received
        uint256 lastTradeTimestamp;
        uint256 joinTimestamp;
        bool isActive;
    }

    struct TradeRecord {
        bytes32 tradeId;
        address counterparty;
        uint256 amount;
        uint256 rating;               // 1-5 scaled by 100 (100-500)
        uint256 timestamp;
        bool wasBuyer;
    }

    struct TierThreshold {
        uint256 minTrades;
        uint256 minRating;            // Scaled by 100
    }

    // ============ State Variables ============
    VeritasSoulboundBadge public immutable soulboundBadge;
    uint64 public immutable chainId;
    
    // User reputation data
    mapping(address => UserReputation) public userReputations;
    
    // User trade history (last 100 trades per user)
    mapping(address => TradeRecord[]) public userTradeHistory;
    
    // Tier thresholds
    mapping(VeritasSoulboundBadge.BadgeTier => TierThreshold) public tierThresholds;
    
    // Pending badge mints (for cross-chain sync)
    mapping(bytes32 => bool) public processedCrossChainUpdates;

    // ============ Events ============
    event ReputationUpdated(
        address indexed user,
        uint256 newTrades,
        uint256 newRating,
        uint256 timestamp
    );
    
    event TradeRecorded(
        bytes32 indexed tradeId,
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        uint256 sellerRating,
        uint256 buyerRating
    );
    
    event DisputeResolved(
        bytes32 indexed tradeId,
        address indexed winner,
        address indexed loser,
        uint256 timestamp
    );
    
    event BadgeThresholdMet(
        address indexed user,
        VeritasSoulboundBadge.BadgeTier tier,
        uint256 trades,
        uint256 rating
    );
    
    event CrossChainReputationSynced(
        address indexed user,
        uint64 indexed sourceChain,
        uint256 trades,
        uint256 rating
    );

    // ============ Errors ============
    error UserNotActive();
    error InvalidRating();
    error TradeAlreadyRecorded();
    error InvalidTierThreshold();

    // ============ Constructor ============
    constructor(
        address _soulboundBadge,
        uint64 _chainId
    ) {
        soulboundBadge = VeritasSoulboundBadge(_soulboundBadge);
        chainId = _chainId;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Initialize tier thresholds
        tierThresholds[VeritasSoulboundBadge.BadgeTier.Bronze] = TierThreshold(10, 400);
        tierThresholds[VeritasSoulboundBadge.BadgeTier.Silver] = TierThreshold(25, 450);
        tierThresholds[VeritasSoulboundBadge.BadgeTier.Gold] = TierThreshold(50, 480);
        tierThresholds[VeritasSoulboundBadge.BadgeTier.Platinum] = TierThreshold(100, 490);
        tierThresholds[VeritasSoulboundBadge.BadgeTier.Diamond] = TierThreshold(250, 495);
    }

    // ============ User Registration ============

    /**
     * @notice Register a new user in the reputation system
     */
    function registerUser(address user) external {
        if (!userReputations[user].isActive) {
            userReputations[user] = UserReputation({
                totalTrades: 0,
                successfulTrades: 0,
                disputesWon: 0,
                disputesLost: 0,
                totalRatingPoints: 0,
                ratingCount: 0,
                lastTradeTimestamp: 0,
                joinTimestamp: block.timestamp,
                isActive: true
            });
        }
    }

    // ============ Trade Recording ============

    /**
     * @notice Record a completed trade and update reputations
     * @dev Only callable by the escrow contract
     * @param tradeId Unique identifier for the trade
     * @param seller The seller's address
     * @param buyer The buyer's address
     * @param amount Trade amount in wei
     * @param sellerRating Rating given to seller (100-500)
     * @param buyerRating Rating given to buyer (100-500)
     */
    function recordTrade(
        bytes32 tradeId,
        address seller,
        address buyer,
        uint256 amount,
        uint256 sellerRating,
        uint256 buyerRating
    ) external onlyRole(ESCROW_ROLE) nonReentrant {
        // Validate ratings (1-5 stars, scaled by 100)
        if (sellerRating < 100 || sellerRating > 500) revert InvalidRating();
        if (buyerRating < 100 || buyerRating > 500) revert InvalidRating();
        
        // Ensure users are registered
        _ensureRegistered(seller);
        _ensureRegistered(buyer);
        
        // Update seller reputation
        _updateReputation(seller, sellerRating, buyer, amount, tradeId, false);
        
        // Update buyer reputation
        _updateReputation(buyer, buyerRating, seller, amount, tradeId, true);
        
        emit TradeRecorded(tradeId, seller, buyer, amount, sellerRating, buyerRating);
        
        // Check and mint badges if thresholds are met
        _checkAndMintBadge(seller);
        _checkAndMintBadge(buyer);
    }

    /**
     * @notice Record a dispute resolution
     * @dev Only callable by dispute resolver
     */
    function recordDisputeResolution(
        bytes32 tradeId,
        address winner,
        address loser
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) {
        userReputations[winner].disputesWon++;
        userReputations[loser].disputesLost++;
        
        emit DisputeResolved(tradeId, winner, loser, block.timestamp);
    }

    // ============ Cross-Chain Sync ============

    /**
     * @notice Sync reputation from another chain
     * @dev Only callable by cross-chain bridge contract
     */
    function syncCrossChainReputation(
        address user,
        uint64 sourceChain,
        uint256 additionalTrades,
        uint256 additionalRatingPoints,
        uint256 additionalRatingCount,
        bytes32 syncId
    ) external onlyRole(CROSS_CHAIN_ROLE) {
        if (processedCrossChainUpdates[syncId]) return;
        processedCrossChainUpdates[syncId] = true;
        
        _ensureRegistered(user);
        
        UserReputation storage rep = userReputations[user];
        rep.totalTrades += additionalTrades;
        rep.successfulTrades += additionalTrades;
        rep.totalRatingPoints += additionalRatingPoints;
        rep.ratingCount += additionalRatingCount;
        
        emit CrossChainReputationSynced(user, sourceChain, additionalTrades, _calculateAverageRating(user));
        
        _checkAndMintBadge(user);
    }

    // ============ Internal Functions ============

    function _ensureRegistered(address user) internal {
        if (!userReputations[user].isActive) {
            userReputations[user] = UserReputation({
                totalTrades: 0,
                successfulTrades: 0,
                disputesWon: 0,
                disputesLost: 0,
                totalRatingPoints: 0,
                ratingCount: 0,
                lastTradeTimestamp: 0,
                joinTimestamp: block.timestamp,
                isActive: true
            });
        }
    }

    function _updateReputation(
        address user,
        uint256 rating,
        address counterparty,
        uint256 amount,
        bytes32 tradeId,
        bool wasBuyer
    ) internal {
        UserReputation storage rep = userReputations[user];
        
        rep.totalTrades++;
        rep.successfulTrades++;
        rep.totalRatingPoints += rating;
        rep.ratingCount++;
        rep.lastTradeTimestamp = block.timestamp;
        
        // Store trade record (keep last 100)
        TradeRecord[] storage history = userTradeHistory[user];
        if (history.length >= 100) {
            // Shift array - remove oldest
            for (uint i = 0; i < history.length - 1; i++) {
                history[i] = history[i + 1];
            }
            history.pop();
        }
        
        history.push(TradeRecord({
            tradeId: tradeId,
            counterparty: counterparty,
            amount: amount,
            rating: rating,
            timestamp: block.timestamp,
            wasBuyer: wasBuyer
        }));
        
        emit ReputationUpdated(
            user,
            rep.successfulTrades,
            _calculateAverageRating(user),
            block.timestamp
        );
    }

    function _checkAndMintBadge(address user) internal {
        UserReputation storage rep = userReputations[user];
        uint256 avgRating = _calculateAverageRating(user);
        
        VeritasSoulboundBadge.BadgeTier currentHighest = soulboundBadge.userHighestTier(user);
        VeritasSoulboundBadge.BadgeTier newTier = _determineEligibleTier(rep.successfulTrades, avgRating);
        
        // Only mint if new tier is higher than current
        if (uint8(newTier) > uint8(currentHighest)) {
            emit BadgeThresholdMet(user, newTier, rep.successfulTrades, avgRating);
            
            try soulboundBadge.mintBadge(
                user,
                newTier,
                rep.successfulTrades,
                avgRating,
                chainId
            ) {} catch {
                // Badge minting failed - could be duplicate, continue
            }
        }
    }

    function _determineEligibleTier(
        uint256 trades,
        uint256 rating
    ) internal view returns (VeritasSoulboundBadge.BadgeTier) {
        // Check from highest to lowest
        if (_meetsThreshold(VeritasSoulboundBadge.BadgeTier.Diamond, trades, rating)) {
            return VeritasSoulboundBadge.BadgeTier.Diamond;
        }
        if (_meetsThreshold(VeritasSoulboundBadge.BadgeTier.Platinum, trades, rating)) {
            return VeritasSoulboundBadge.BadgeTier.Platinum;
        }
        if (_meetsThreshold(VeritasSoulboundBadge.BadgeTier.Gold, trades, rating)) {
            return VeritasSoulboundBadge.BadgeTier.Gold;
        }
        if (_meetsThreshold(VeritasSoulboundBadge.BadgeTier.Silver, trades, rating)) {
            return VeritasSoulboundBadge.BadgeTier.Silver;
        }
        if (_meetsThreshold(VeritasSoulboundBadge.BadgeTier.Bronze, trades, rating)) {
            return VeritasSoulboundBadge.BadgeTier.Bronze;
        }
        return VeritasSoulboundBadge.BadgeTier.None;
    }

    function _meetsThreshold(
        VeritasSoulboundBadge.BadgeTier tier,
        uint256 trades,
        uint256 rating
    ) internal view returns (bool) {
        TierThreshold memory threshold = tierThresholds[tier];
        return trades >= threshold.minTrades && rating >= threshold.minRating;
    }

    function _calculateAverageRating(address user) internal view returns (uint256) {
        UserReputation storage rep = userReputations[user];
        if (rep.ratingCount == 0) return 0;
        return rep.totalRatingPoints / rep.ratingCount;
    }

    // ============ View Functions ============

    /**
     * @notice Get full reputation data for a user
     */
    function getReputation(address user) external view returns (
        uint256 totalTrades,
        uint256 successfulTrades,
        uint256 averageRating,
        uint256 disputesWon,
        uint256 disputesLost,
        uint256 memberSince,
        VeritasSoulboundBadge.BadgeTier highestBadge
    ) {
        UserReputation storage rep = userReputations[user];
        return (
            rep.totalTrades,
            rep.successfulTrades,
            _calculateAverageRating(user),
            rep.disputesWon,
            rep.disputesLost,
            rep.joinTimestamp,
            soulboundBadge.userHighestTier(user)
        );
    }

    /**
     * @notice Get user's trade history
     */
    function getTradeHistory(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (TradeRecord[] memory) {
        TradeRecord[] storage history = userTradeHistory[user];
        
        if (offset >= history.length) {
            return new TradeRecord[](0);
        }
        
        uint256 end = offset + limit;
        if (end > history.length) {
            end = history.length;
        }
        
        TradeRecord[] memory result = new TradeRecord[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = history[i];
        }
        
        return result;
    }

    /**
     * @notice Check if user meets a specific tier threshold
     */
    function meetsThreshold(
        address user,
        VeritasSoulboundBadge.BadgeTier tier
    ) external view returns (bool) {
        UserReputation storage rep = userReputations[user];
        return _meetsThreshold(tier, rep.successfulTrades, _calculateAverageRating(user));
    }

    /**
     * @notice Get progress towards next tier
     */
    function getProgressToNextTier(address user) external view returns (
        VeritasSoulboundBadge.BadgeTier currentTier,
        VeritasSoulboundBadge.BadgeTier nextTier,
        uint256 tradesNeeded,
        uint256 currentTrades,
        uint256 ratingNeeded,
        uint256 currentRating
    ) {
        UserReputation storage rep = userReputations[user];
        currentTier = soulboundBadge.userHighestTier(user);
        currentTrades = rep.successfulTrades;
        currentRating = _calculateAverageRating(user);
        
        if (currentTier == VeritasSoulboundBadge.BadgeTier.Diamond) {
            return (currentTier, VeritasSoulboundBadge.BadgeTier.None, 0, currentTrades, 0, currentRating);
        }
        
        nextTier = VeritasSoulboundBadge.BadgeTier(uint8(currentTier) + 1);
        TierThreshold memory threshold = tierThresholds[nextTier];
        
        tradesNeeded = threshold.minTrades > currentTrades ? threshold.minTrades - currentTrades : 0;
        ratingNeeded = threshold.minRating > currentRating ? threshold.minRating - currentRating : 0;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update tier thresholds
     */
    function updateTierThreshold(
        VeritasSoulboundBadge.BadgeTier tier,
        uint256 minTrades,
        uint256 minRating
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tier == VeritasSoulboundBadge.BadgeTier.None) revert InvalidTierThreshold();
        tierThresholds[tier] = TierThreshold(minTrades, minRating);
    }
}

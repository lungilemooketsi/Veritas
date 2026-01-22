// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ISoulbound (EIP-5192)
 * @notice Minimal interface for Soulbound Tokens
 * @dev See https://eips.ethereum.org/EIPS/eip-5192
 */
interface IERC5192 {
    /// @notice Emitted when the locking status is changed to locked.
    event Locked(uint256 tokenId);
    
    /// @notice Emitted when the locking status is changed to unlocked.
    event Unlocked(uint256 tokenId);
    
    /// @notice Returns the locking status of an Soulbound Token
    function locked(uint256 tokenId) external view returns (bool);
}

/**
 * @title VeritasSoulboundBadge
 * @notice Non-transferable reputation badges for the Veritas Marketplace
 * @dev Implements EIP-5192 for Soulbound Tokens
 * 
 * Badge Tiers:
 * - Bronze: 10+ trades, 4.0+ rating
 * - Silver: 25+ trades, 4.5+ rating  
 * - Gold: 50+ trades, 4.8+ rating
 * - Platinum: 100+ trades, 4.9+ rating
 * - Diamond: 250+ trades, 4.95+ rating
 */
contract VeritasSoulboundBadge is ERC721, IERC5192, AccessControl {
    using Strings for uint256;

    // ============ Roles ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    // ============ Enums ============
    enum BadgeTier {
        None,
        Bronze,
        Silver,
        Gold,
        Platinum,
        Diamond
    }

    // ============ Structs ============
    struct BadgeMetadata {
        BadgeTier tier;
        uint256 tradesAtMint;
        uint256 ratingAtMint; // Scaled by 100 (e.g., 485 = 4.85)
        uint256 mintTimestamp;
        uint64 sourceChainId;
    }

    // ============ State Variables ============
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;
    
    // Mapping from token ID to badge metadata
    mapping(uint256 => BadgeMetadata) public badgeMetadata;
    
    // Mapping from address to their badge token IDs per tier
    mapping(address => mapping(BadgeTier => uint256)) public userBadges;
    
    // Mapping from address to their highest tier
    mapping(address => BadgeTier) public userHighestTier;

    // ============ Events ============
    event BadgeMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        BadgeTier tier,
        uint256 trades,
        uint256 rating
    );
    
    event BadgeUpgraded(
        address indexed holder,
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        BadgeTier oldTier,
        BadgeTier newTier
    );

    // ============ Errors ============
    error SoulboundTokenNonTransferable();
    error BadgeAlreadyExists(address holder, BadgeTier tier);
    error InvalidTier();
    error ZeroAddress();

    // ============ Constructor ============
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(URI_SETTER_ROLE, msg.sender);
        _baseTokenURI = baseURI;
    }

    // ============ EIP-5192 Implementation ============
    
    /**
     * @notice All tokens are permanently locked (soulbound)
     * @param tokenId The token to check
     * @return bool Always returns true as all tokens are soulbound
     */
    function locked(uint256 tokenId) external view override returns (bool) {
        // Revert if token doesn't exist
        _requireOwned(tokenId);
        // All tokens are permanently locked
        return true;
    }

    // ============ Minting Functions ============

    /**
     * @notice Mint a new soulbound badge to a user
     * @dev Only callable by addresses with MINTER_ROLE (typically the ReputationEngine)
     * @param to The recipient address
     * @param tier The badge tier to mint
     * @param trades Number of successful trades at mint time
     * @param rating User's rating at mint time (scaled by 100)
     * @param sourceChainId The chain where the reputation was earned
     */
    function mintBadge(
        address to,
        BadgeTier tier,
        uint256 trades,
        uint256 rating,
        uint64 sourceChainId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (to == address(0)) revert ZeroAddress();
        if (tier == BadgeTier.None) revert InvalidTier();
        
        // Check if user already has this tier badge
        if (userBadges[to][tier] != 0) {
            revert BadgeAlreadyExists(to, tier);
        }

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Store metadata
        badgeMetadata[tokenId] = BadgeMetadata({
            tier: tier,
            tradesAtMint: trades,
            ratingAtMint: rating,
            mintTimestamp: block.timestamp,
            sourceChainId: sourceChainId
        });

        // Update user mappings
        userBadges[to][tier] = tokenId;
        
        // Update highest tier if applicable
        if (uint8(tier) > uint8(userHighestTier[to])) {
            userHighestTier[to] = tier;
        }

        // Mint the token
        _safeMint(to, tokenId);
        
        // Emit locked event per EIP-5192
        emit Locked(tokenId);
        emit BadgeMinted(to, tokenId, tier, trades, rating);

        return tokenId;
    }

    /**
     * @notice Upgrade a user's badge to a higher tier
     * @dev Burns the old badge and mints a new one
     */
    function upgradeBadge(
        address holder,
        BadgeTier newTier,
        uint256 trades,
        uint256 rating,
        uint64 sourceChainId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        BadgeTier currentTier = userHighestTier[holder];
        if (uint8(newTier) <= uint8(currentTier)) revert InvalidTier();
        
        uint256 oldTokenId = userBadges[holder][currentTier];
        
        // Mint new badge
        uint256 newTokenId = this.mintBadge(holder, newTier, trades, rating, sourceChainId);
        
        emit BadgeUpgraded(holder, oldTokenId, newTokenId, currentTier, newTier);
        
        return newTokenId;
    }

    // ============ View Functions ============

    /**
     * @notice Get all badge token IDs for a user
     */
    function getUserBadges(address user) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count badges
        for (uint8 i = 1; i <= 5; i++) {
            if (userBadges[user][BadgeTier(i)] != 0) count++;
        }
        
        // Populate array
        uint256[] memory badges = new uint256[](count);
        uint256 index = 0;
        for (uint8 i = 1; i <= 5; i++) {
            uint256 tokenId = userBadges[user][BadgeTier(i)];
            if (tokenId != 0) {
                badges[index] = tokenId;
                index++;
            }
        }
        
        return badges;
    }

    /**
     * @notice Check if a user has at least a certain tier
     */
    function hasMinimumTier(address user, BadgeTier minTier) external view returns (bool) {
        return uint8(userHighestTier[user]) >= uint8(minTier);
    }

    /**
     * @notice Get tier name as string
     */
    function getTierName(BadgeTier tier) public pure returns (string memory) {
        if (tier == BadgeTier.Bronze) return "Bronze";
        if (tier == BadgeTier.Silver) return "Silver";
        if (tier == BadgeTier.Gold) return "Gold";
        if (tier == BadgeTier.Platinum) return "Platinum";
        if (tier == BadgeTier.Diamond) return "Diamond";
        return "None";
    }

    // ============ URI Functions ============

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory newBaseURI) external onlyRole(URI_SETTER_ROLE) {
        _baseTokenURI = newBaseURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        BadgeMetadata memory meta = badgeMetadata[tokenId];
        string memory tierName = getTierName(meta.tier);
        
        return string(
            abi.encodePacked(
                _baseTokenURI,
                tierName,
                "/",
                tokenId.toString(),
                ".json"
            )
        );
    }

    // ============ Transfer Overrides (Soulbound) ============

    /**
     * @dev Override to prevent transfers - tokens are soulbound
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but block all transfers
        if (from != address(0) && to != address(0)) {
            revert SoulboundTokenNonTransferable();
        }
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override approve to prevent approvals (meaningless for soulbound)
     */
    function approve(address, uint256) public pure override {
        revert SoulboundTokenNonTransferable();
    }

    /**
     * @dev Override setApprovalForAll to prevent approvals
     */
    function setApprovalForAll(address, bool) public pure override {
        revert SoulboundTokenNonTransferable();
    }

    // ============ Interface Support ============

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return 
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}

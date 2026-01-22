// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationEngine.sol";

/**
 * @title VeritasCrossChainBridge
 * @notice Cross-chain bridge for assets and reputation using Chainlink CCIP
 * @dev Enables users to bridge USDC and sync reputation across supported chains
 * 
 * Supported Flows:
 * 1. Token Bridging: Lock tokens on source → Release/Mint on destination
 * 2. Reputation Sync: Sync reputation scores across chains
 * 3. SBT Recognition: Recognize SBT badges from other chains
 */
contract VeritasCrossChainBridge is CCIPReceiver, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Roles ============
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ============ Enums ============
    enum MessageType {
        TokenTransfer,
        ReputationSync,
        BadgeRecognition
    }

    // ============ Structs ============
    struct ChainConfig {
        uint64 chainSelector;        // CCIP chain selector
        address bridgeContract;      // Bridge contract on that chain
        address usdcToken;           // USDC address on that chain
        bool isActive;
    }

    struct PendingTransfer {
        address sender;
        address recipient;
        uint256 amount;
        uint64 destinationChain;
        uint256 timestamp;
        bool isProcessed;
    }

    struct CrossChainMessage {
        MessageType messageType;
        address sender;
        address recipient;
        uint256 amount;
        bytes data;
    }

    // ============ State Variables ============
    ReputationEngine public reputationEngine;
    IERC20 public immutable linkToken;
    IERC20 public immutable usdcToken;
    uint64 public immutable currentChainSelector;
    
    // Chain configurations
    mapping(uint64 => ChainConfig) public chainConfigs;
    uint64[] public supportedChains;
    
    // Pending transfers
    mapping(bytes32 => PendingTransfer) public pendingTransfers;
    
    // Processed message tracking (prevent replay)
    mapping(bytes32 => bool) public processedMessages;
    
    // Fee configuration
    uint256 public bridgeFeeRate = 50; // 0.5% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    address public feeRecipient;
    
    // Liquidity pool for fast transfers
    mapping(uint64 => uint256) public liquidityPool;

    // ============ Events ============
    event ChainConfigured(
        uint64 indexed chainSelector,
        address bridgeContract,
        address usdcToken
    );
    
    event BridgeInitiated(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed recipient,
        uint64 destinationChain,
        uint256 amount,
        uint256 fee
    );
    
    event BridgeCompleted(
        bytes32 indexed messageId,
        address indexed recipient,
        uint256 amount
    );
    
    event ReputationSynced(
        bytes32 indexed messageId,
        address indexed user,
        uint64 sourceChain,
        uint256 trades,
        uint256 rating
    );
    
    event LiquidityAdded(
        uint64 indexed chainSelector,
        address indexed provider,
        uint256 amount
    );
    
    event LiquidityRemoved(
        uint64 indexed chainSelector,
        address indexed provider,
        uint256 amount
    );

    // ============ Errors ============
    error UnsupportedChain();
    error InsufficientAmount();
    error InsufficientLiquidity();
    error MessageAlreadyProcessed();
    error InvalidMessageSource();
    error TransferFailed();

    // ============ Constructor ============
    constructor(
        address _router,
        address _linkToken,
        address _usdcToken,
        address _reputationEngine,
        uint64 _chainSelector,
        address _feeRecipient
    ) CCIPReceiver(_router) {
        linkToken = IERC20(_linkToken);
        usdcToken = IERC20(_usdcToken);
        reputationEngine = ReputationEngine(_reputationEngine);
        currentChainSelector = _chainSelector;
        feeRecipient = _feeRecipient;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    // ============ Chain Configuration ============

    /**
     * @notice Configure a supported destination chain
     */
    function configureChain(
        uint64 chainSelector,
        address bridgeContract,
        address chainUsdcToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        chainConfigs[chainSelector] = ChainConfig({
            chainSelector: chainSelector,
            bridgeContract: bridgeContract,
            usdcToken: chainUsdcToken,
            isActive: true
        });
        
        // Add to supported chains if new
        bool exists = false;
        for (uint i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == chainSelector) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            supportedChains.push(chainSelector);
        }
        
        emit ChainConfigured(chainSelector, bridgeContract, chainUsdcToken);
    }

    /**
     * @notice Deactivate a chain
     */
    function deactivateChain(uint64 chainSelector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        chainConfigs[chainSelector].isActive = false;
    }

    // ============ Token Bridging ============

    /**
     * @notice Bridge USDC to another chain
     * @param destinationChain The CCIP chain selector of destination
     * @param recipient The recipient address on destination chain
     * @param amount The amount of USDC to bridge
     * @param useLiquidityPool If true, use fast liquidity pool (may have higher fees)
     */
    function bridgeTokens(
        uint64 destinationChain,
        address recipient,
        uint256 amount,
        bool useLiquidityPool
    ) external nonReentrant returns (bytes32) {
        ChainConfig memory config = chainConfigs[destinationChain];
        if (!config.isActive) revert UnsupportedChain();
        if (amount == 0) revert InsufficientAmount();
        
        // Calculate fee
        uint256 fee = (amount * bridgeFeeRate) / BASIS_POINTS;
        uint256 netAmount = amount - fee;
        
        // Transfer tokens from sender
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to recipient
        if (fee > 0) {
            usdcToken.safeTransfer(feeRecipient, fee);
        }
        
        bytes32 messageId;
        
        if (useLiquidityPool && liquidityPool[destinationChain] >= netAmount) {
            // Use liquidity pool for instant transfer
            messageId = _sendLiquidityPoolMessage(destinationChain, recipient, netAmount);
        } else {
            // Use standard CCIP transfer
            messageId = _sendCCIPMessage(destinationChain, recipient, netAmount);
        }
        
        emit BridgeInitiated(messageId, msg.sender, recipient, destinationChain, netAmount, fee);
        
        return messageId;
    }

    /**
     * @notice Send CCIP message for token transfer
     */
    function _sendCCIPMessage(
        uint64 destinationChain,
        address recipient,
        uint256 amount
    ) internal returns (bytes32) {
        ChainConfig memory config = chainConfigs[destinationChain];
        
        // Prepare message
        CrossChainMessage memory message = CrossChainMessage({
            messageType: MessageType.TokenTransfer,
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            data: ""
        });
        
        // Build CCIP message
        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(config.bridgeContract),
            data: abi.encode(message),
            tokenAmounts: new Client.EVMTokenAmount[](0), // We handle tokens ourselves
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 300_000})
            ),
            feeToken: address(linkToken)
        });
        
        // Get fee and approve
        uint256 ccipFee = IRouterClient(i_ccipRouter).getFee(destinationChain, ccipMessage);
        linkToken.approve(i_ccipRouter, ccipFee);
        
        // Send message
        bytes32 messageId = IRouterClient(i_ccipRouter).ccipSend(destinationChain, ccipMessage);
        
        // Store pending transfer
        pendingTransfers[messageId] = PendingTransfer({
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            destinationChain: destinationChain,
            timestamp: block.timestamp,
            isProcessed: false
        });
        
        return messageId;
    }

    /**
     * @notice Send liquidity pool release message
     */
    function _sendLiquidityPoolMessage(
        uint64 destinationChain,
        address recipient,
        uint256 amount
    ) internal returns (bytes32) {
        // Deduct from liquidity pool tracking
        liquidityPool[destinationChain] -= amount;
        
        // Send CCIP message to release from destination pool
        return _sendCCIPMessage(destinationChain, recipient, amount);
    }

    // ============ Reputation Bridging ============

    /**
     * @notice Sync reputation to another chain
     * @param destinationChain The destination chain selector
     */
    function syncReputation(uint64 destinationChain) external nonReentrant returns (bytes32) {
        ChainConfig memory config = chainConfigs[destinationChain];
        if (!config.isActive) revert UnsupportedChain();
        
        // Get user's reputation data
        (
            uint256 totalTrades,
            uint256 successfulTrades,
            uint256 averageRating,
            , , ,
        ) = reputationEngine.getReputation(msg.sender);
        
        // Prepare reputation sync message
        CrossChainMessage memory message = CrossChainMessage({
            messageType: MessageType.ReputationSync,
            sender: msg.sender,
            recipient: msg.sender,
            amount: 0,
            data: abi.encode(successfulTrades, averageRating * successfulTrades, successfulTrades)
        });
        
        // Build and send CCIP message
        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(config.bridgeContract),
            data: abi.encode(message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 500_000})
            ),
            feeToken: address(linkToken)
        });
        
        uint256 ccipFee = IRouterClient(i_ccipRouter).getFee(destinationChain, ccipMessage);
        linkToken.approve(i_ccipRouter, ccipFee);
        
        bytes32 messageId = IRouterClient(i_ccipRouter).ccipSend(destinationChain, ccipMessage);
        
        emit ReputationSynced(messageId, msg.sender, currentChainSelector, successfulTrades, averageRating);
        
        return messageId;
    }

    // ============ CCIP Receiver ============

    /**
     * @notice Handle incoming CCIP messages
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override nonReentrant {
        bytes32 messageId = message.messageId;
        
        // Prevent replay
        if (processedMessages[messageId]) revert MessageAlreadyProcessed();
        processedMessages[messageId] = true;
        
        // Verify source
        uint64 sourceChain = message.sourceChainSelector;
        address sourceAddress = abi.decode(message.sender, (address));
        
        ChainConfig memory config = chainConfigs[sourceChain];
        if (sourceAddress != config.bridgeContract) revert InvalidMessageSource();
        
        // Decode message
        CrossChainMessage memory crossChainMsg = abi.decode(message.data, (CrossChainMessage));
        
        if (crossChainMsg.messageType == MessageType.TokenTransfer) {
            _handleTokenTransfer(messageId, crossChainMsg);
        } else if (crossChainMsg.messageType == MessageType.ReputationSync) {
            _handleReputationSync(messageId, crossChainMsg, sourceChain);
        }
    }

    /**
     * @notice Handle incoming token transfer
     */
    function _handleTokenTransfer(
        bytes32 messageId,
        CrossChainMessage memory message
    ) internal {
        // Release tokens from this chain's pool
        uint256 balance = usdcToken.balanceOf(address(this));
        if (balance < message.amount) revert InsufficientLiquidity();
        
        usdcToken.safeTransfer(message.recipient, message.amount);
        
        emit BridgeCompleted(messageId, message.recipient, message.amount);
    }

    /**
     * @notice Handle incoming reputation sync
     */
    function _handleReputationSync(
        bytes32 messageId,
        CrossChainMessage memory message,
        uint64 sourceChain
    ) internal {
        (
            uint256 additionalTrades,
            uint256 additionalRatingPoints,
            uint256 additionalRatingCount
        ) = abi.decode(message.data, (uint256, uint256, uint256));
        
        bytes32 syncId = keccak256(abi.encodePacked(messageId, sourceChain, message.sender));
        
        reputationEngine.syncCrossChainReputation(
            message.sender,
            sourceChain,
            additionalTrades,
            additionalRatingPoints,
            additionalRatingCount,
            syncId
        );
        
        uint256 avgRating = additionalRatingCount > 0 
            ? additionalRatingPoints / additionalRatingCount 
            : 0;
        
        emit ReputationSynced(messageId, message.sender, sourceChain, additionalTrades, avgRating);
    }

    // ============ Liquidity Management ============

    /**
     * @notice Add liquidity to the pool for fast transfers
     */
    function addLiquidity(uint64 destinationChain, uint256 amount) external nonReentrant {
        if (!chainConfigs[destinationChain].isActive) revert UnsupportedChain();
        
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        liquidityPool[destinationChain] += amount;
        
        emit LiquidityAdded(destinationChain, msg.sender, amount);
    }

    /**
     * @notice Remove liquidity from the pool
     */
    function removeLiquidity(
        uint64 destinationChain,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (liquidityPool[destinationChain] < amount) revert InsufficientLiquidity();
        
        liquidityPool[destinationChain] -= amount;
        usdcToken.safeTransfer(msg.sender, amount);
        
        emit LiquidityRemoved(destinationChain, msg.sender, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get bridge fee estimate
     */
    function estimateBridgeFee(
        uint64 destinationChain,
        uint256 amount
    ) external view returns (uint256 platformFee, uint256 ccipFee) {
        platformFee = (amount * bridgeFeeRate) / BASIS_POINTS;
        
        ChainConfig memory config = chainConfigs[destinationChain];
        
        CrossChainMessage memory message = CrossChainMessage({
            messageType: MessageType.TokenTransfer,
            sender: msg.sender,
            recipient: msg.sender,
            amount: amount,
            data: ""
        });
        
        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(config.bridgeContract),
            data: abi.encode(message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 300_000})
            ),
            feeToken: address(linkToken)
        });
        
        ccipFee = IRouterClient(i_ccipRouter).getFee(destinationChain, ccipMessage);
    }

    /**
     * @notice Get supported chains
     */
    function getSupportedChains() external view returns (uint64[] memory) {
        return supportedChains;
    }

    /**
     * @notice Check if chain is supported and active
     */
    function isChainSupported(uint64 chainSelector) external view returns (bool) {
        return chainConfigs[chainSelector].isActive;
    }

    // ============ Admin Functions ============

    function setReputationEngine(address _reputationEngine) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reputationEngine = ReputationEngine(_reputationEngine);
    }

    function setBridgeFeeRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRate <= 500, "Fee too high"); // Max 5%
        bridgeFeeRate = newRate;
    }

    function setFeeRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRecipient = newRecipient;
    }

    /**
     * @notice Withdraw accumulated LINK tokens
     */
    function withdrawLink(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        linkToken.safeTransfer(to, amount);
    }

    /**
     * @notice Emergency withdrawal
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }
}

import { ethers } from 'ethers';
import { logger } from './logger.js';

// ABIs (simplified for the functions we need)
const ESCROW_ABI = [
  'function getTrade(bytes32 tradeId) view returns (tuple(bytes32 tradeId, address buyer, address seller, address paymentToken, uint256 amount, uint256 platformFee, uint256 createdAt, uint256 expiresAt, uint256 deliveredAt, uint256 completedAt, uint8 status, string itemDescription, string deliveryProof, uint256 buyerRating, uint256 sellerRating))',
  'function getUserTrades(address user) view returns (bytes32[])',
  'function calculateFee(uint256 amount) view returns (uint256)',
  'function createTrade(address seller, address paymentToken, uint256 amount, string itemDescription, uint256 expiryDuration) returns (bytes32)',
  'function confirmDelivery(bytes32 tradeId, uint256 sellerRating)',
];

const REPUTATION_ABI = [
  'function getReputation(address user) view returns (uint256 totalTrades, uint256 successfulTrades, uint256 averageRating, uint256 disputesWon, uint256 disputesLost, uint256 memberSince, uint8 highestBadge)',
  'function getProgressToNextTier(address user) view returns (uint8 currentTier, uint8 nextTier, uint256 tradesNeeded, uint256 currentTrades, uint256 ratingNeeded, uint256 currentRating)',
  'function getTradeHistory(address user, uint256 offset, uint256 limit) view returns (tuple(bytes32 tradeId, address counterparty, uint256 amount, uint256 rating, uint256 timestamp, bool wasBuyer)[])',
];

const SOULBOUND_ABI = [
  'function getUserBadges(address user) view returns (uint256[])',
  'function badgeMetadata(uint256 tokenId) view returns (tuple(uint8 tier, uint256 tradesAtMint, uint256 ratingAtMint, uint256 mintTimestamp, uint64 sourceChainId))',
  'function hasMinimumTier(address user, uint8 minTier) view returns (bool)',
  'function userHighestTier(address user) view returns (uint8)',
  'function locked(uint256 tokenId) view returns (bool)',
];

interface NetworkConfig {
  rpcUrl: string;
  escrowAddress: string;
  reputationAddress: string;
  soulboundAddress: string;
}

const NETWORK_CONFIGS: Record<number, NetworkConfig> = {
  137: { // Polygon Mainnet
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    escrowAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_POLYGON || '',
    reputationAddress: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_POLYGON || '',
    soulboundAddress: process.env.NEXT_PUBLIC_SOULBOUND_CONTRACT_POLYGON || '',
  },
  42161: { // Arbitrum One
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    escrowAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ARBITRUM || '',
    reputationAddress: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ARBITRUM || '',
    soulboundAddress: process.env.NEXT_PUBLIC_SOULBOUND_CONTRACT_ARBITRUM || '',
  },
  80001: { // Polygon Mumbai (testnet)
    rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    escrowAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_POLYGON || '',
    reputationAddress: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_POLYGON || '',
    soulboundAddress: process.env.NEXT_PUBLIC_SOULBOUND_CONTRACT_POLYGON || '',
  },
};

// Provider cache
const providers: Map<number, ethers.JsonRpcProvider> = new Map();

export function getProvider(chainId: number): ethers.JsonRpcProvider {
  if (!providers.has(chainId)) {
    const config = NETWORK_CONFIGS[chainId];
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    providers.set(chainId, new ethers.JsonRpcProvider(config.rpcUrl));
  }
  return providers.get(chainId)!;
}

export function getEscrowContract(chainId: number): ethers.Contract {
  const config = NETWORK_CONFIGS[chainId];
  if (!config || !config.escrowAddress) {
    throw new Error(`Escrow contract not configured for chain ${chainId}`);
  }
  const provider = getProvider(chainId);
  return new ethers.Contract(config.escrowAddress, ESCROW_ABI, provider);
}

export function getReputationContract(chainId: number): ethers.Contract {
  const config = NETWORK_CONFIGS[chainId];
  if (!config || !config.reputationAddress) {
    throw new Error(`Reputation contract not configured for chain ${chainId}`);
  }
  const provider = getProvider(chainId);
  return new ethers.Contract(config.reputationAddress, REPUTATION_ABI, provider);
}

export function getSoulboundContract(chainId: number): ethers.Contract {
  const config = NETWORK_CONFIGS[chainId];
  if (!config || !config.soulboundAddress) {
    throw new Error(`Soulbound contract not configured for chain ${chainId}`);
  }
  const provider = getProvider(chainId);
  return new ethers.Contract(config.soulboundAddress, SOULBOUND_ABI, provider);
}

export function getSupportedChainIds(): number[] {
  return Object.keys(NETWORK_CONFIGS).map(Number);
}

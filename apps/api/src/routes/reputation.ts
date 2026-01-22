import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { getReputationContract, getSoulboundContract } from '../utils/contracts.js';

const router = Router();

/**
 * @route GET /api/reputation/:address
 * @description Get user's reputation data
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const chainId = parseInt(req.query.chainId as string) || 137;

    const reputationEngine = getReputationContract(chainId);
    
    const [
      totalTrades,
      successfulTrades,
      averageRating,
      disputesWon,
      disputesLost,
      memberSince,
      highestBadge,
    ] = await reputationEngine.getReputation(address);

    res.json({
      success: true,
      reputation: {
        address,
        totalTrades: Number(totalTrades),
        successfulTrades: Number(successfulTrades),
        averageRating: Number(averageRating) / 100, // Convert from scaled
        disputesWon: Number(disputesWon),
        disputesLost: Number(disputesLost),
        memberSince: memberSince > 0 
          ? new Date(Number(memberSince) * 1000).toISOString() 
          : null,
        highestBadge: getBadgeTierName(Number(highestBadge)),
        highestBadgeTier: Number(highestBadge),
        chainId,
      },
    });
  } catch (error) {
    logger.error('Failed to get reputation', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve reputation',
    });
  }
});

/**
 * @route GET /api/reputation/:address/progress
 * @description Get user's progress towards next badge tier
 */
router.get('/:address/progress', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const chainId = parseInt(req.query.chainId as string) || 137;

    const reputationEngine = getReputationContract(chainId);
    
    const [
      currentTier,
      nextTier,
      tradesNeeded,
      currentTrades,
      ratingNeeded,
      currentRating,
    ] = await reputationEngine.getProgressToNextTier(address);

    res.json({
      success: true,
      progress: {
        address,
        currentTier: getBadgeTierName(Number(currentTier)),
        currentTierLevel: Number(currentTier),
        nextTier: nextTier > 0 ? getBadgeTierName(Number(nextTier)) : null,
        nextTierLevel: Number(nextTier),
        tradesNeeded: Number(tradesNeeded),
        currentTrades: Number(currentTrades),
        ratingNeeded: Number(ratingNeeded) / 100,
        currentRating: Number(currentRating) / 100,
        tradesProgress: calculateProgress(
          Number(currentTrades), 
          Number(currentTrades) + Number(tradesNeeded)
        ),
        ratingProgress: calculateProgress(
          Number(currentRating),
          Number(currentRating) + Number(ratingNeeded)
        ),
      },
    });
  } catch (error) {
    logger.error('Failed to get reputation progress', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve progress',
    });
  }
});

/**
 * @route GET /api/reputation/:address/badges
 * @description Get user's soulbound badges
 */
router.get('/:address/badges', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const chainId = parseInt(req.query.chainId as string) || 137;

    const soulboundBadge = getSoulboundContract(chainId);
    
    const tokenIds = await soulboundBadge.getUserBadges(address);
    
    // Fetch metadata for each badge
    const badges = await Promise.all(
      tokenIds.map(async (tokenId: bigint) => {
        const metadata = await soulboundBadge.badgeMetadata(tokenId);
        return {
          tokenId: tokenId.toString(),
          tier: getBadgeTierName(Number(metadata.tier)),
          tierLevel: Number(metadata.tier),
          tradesAtMint: Number(metadata.tradesAtMint),
          ratingAtMint: Number(metadata.ratingAtMint) / 100,
          mintTimestamp: new Date(Number(metadata.mintTimestamp) * 1000).toISOString(),
          sourceChainId: Number(metadata.sourceChainId),
          isLocked: true, // Always true per EIP-5192
        };
      })
    );

    res.json({
      success: true,
      badges,
      count: badges.length,
      highestTier: badges.length > 0 
        ? Math.max(...badges.map(b => b.tierLevel))
        : 0,
    });
  } catch (error) {
    logger.error('Failed to get badges', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve badges',
    });
  }
});

/**
 * @route GET /api/reputation/:address/history
 * @description Get user's trade history
 */
router.get('/:address/history', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const chainId = parseInt(req.query.chainId as string) || 137;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    const reputationEngine = getReputationContract(chainId);
    
    const history = await reputationEngine.getTradeHistory(address, offset, limit);
    
    const trades = history.map((record: any) => ({
      tradeId: record.tradeId,
      counterparty: record.counterparty,
      amount: record.amount.toString(),
      rating: Number(record.rating) / 100,
      timestamp: new Date(Number(record.timestamp) * 1000).toISOString(),
      wasBuyer: record.wasBuyer,
    }));

    res.json({
      success: true,
      history: trades,
      count: trades.length,
      offset,
      limit,
    });
  } catch (error) {
    logger.error('Failed to get trade history', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve history',
    });
  }
});

/**
 * @route GET /api/reputation/:address/verify
 * @description Verify a user's badge (for external dApps)
 */
router.get('/:address/verify', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const minTier = parseInt(req.query.minTier as string) || 1;
    const chainId = parseInt(req.query.chainId as string) || 137;

    const soulboundBadge = getSoulboundContract(chainId);
    
    const hasMinTier = await soulboundBadge.hasMinimumTier(address, minTier);
    const highestTier = await soulboundBadge.userHighestTier(address);

    res.json({
      success: true,
      verification: {
        address,
        verified: hasMinTier,
        requestedMinTier: getBadgeTierName(minTier),
        actualTier: getBadgeTierName(Number(highestTier)),
        chainId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to verify badge', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to verify',
    });
  }
});

/**
 * @route GET /api/reputation/tiers
 * @description Get all tier requirements
 */
router.get('/tiers/requirements', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    tiers: [
      {
        tier: 0,
        name: 'None',
        minTrades: 0,
        minRating: 0,
        color: '#6B7280',
        description: 'No badge earned yet',
      },
      {
        tier: 1,
        name: 'Bronze',
        minTrades: 10,
        minRating: 4.0,
        color: '#CD7F32',
        description: 'Emerging trader with solid start',
      },
      {
        tier: 2,
        name: 'Silver',
        minTrades: 25,
        minRating: 4.5,
        color: '#C0C0C0',
        description: 'Reliable marketplace participant',
      },
      {
        tier: 3,
        name: 'Gold',
        minTrades: 50,
        minRating: 4.8,
        color: '#FFD700',
        description: 'Trusted community member',
      },
      {
        tier: 4,
        name: 'Platinum',
        minTrades: 100,
        minRating: 4.9,
        color: '#E5E4E2',
        description: 'Elite marketplace veteran',
      },
      {
        tier: 5,
        name: 'Diamond',
        minTrades: 250,
        minRating: 4.95,
        color: '#B9F2FF',
        description: 'Legendary status achieved',
      },
    ],
  });
});

// Helper functions
function getBadgeTierName(tier: number): string {
  const tiers = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  return tiers[tier] || 'Unknown';
}

function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
}

export { router as reputationRouter };

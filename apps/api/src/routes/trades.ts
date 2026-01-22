import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { getEscrowContract, getProvider } from '../utils/contracts.js';

const router = Router();

// Validation schemas
const createTradeSchema = z.object({
  seller: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(), // Amount in wei/smallest unit
  itemDescription: z.string().min(10).max(1000),
  expiryDuration: z.number().optional(),
  chainId: z.number(),
});

const tradeActionSchema = z.object({
  tradeId: z.string(),
  chainId: z.number(),
});

/**
 * @route GET /api/trades/:tradeId
 * @description Get trade details
 */
router.get('/:tradeId', async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const chainId = parseInt(req.query.chainId as string) || 137;

    const escrow = getEscrowContract(chainId);
    const trade = await escrow.getTrade(tradeId);

    res.json({
      success: true,
      trade: formatTrade(trade, tradeId),
    });
  } catch (error) {
    logger.error('Failed to get trade', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trade',
    });
  }
});

/**
 * @route GET /api/trades/user/:address
 * @description Get all trades for a user
 */
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const chainId = parseInt(req.query.chainId as string) || 137;

    const escrow = getEscrowContract(chainId);
    const tradeIds = await escrow.getUserTrades(address);

    // Fetch trade details for each ID
    const trades = await Promise.all(
      tradeIds.map(async (id: string) => {
        const trade = await escrow.getTrade(id);
        return formatTrade(trade, id);
      })
    );

    res.json({
      success: true,
      trades,
      count: trades.length,
    });
  } catch (error) {
    logger.error('Failed to get user trades', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trades',
    });
  }
});

/**
 * @route POST /api/trades/prepare-create
 * @description Prepare transaction data for creating a trade
 */
router.post('/prepare-create', async (req: Request, res: Response) => {
  try {
    const validatedData = createTradeSchema.parse(req.body);

    const escrow = getEscrowContract(validatedData.chainId);
    const escrowAddress = await escrow.getAddress();

    // Encode transaction data
    const txData = escrow.interface.encodeFunctionData('createTrade', [
      validatedData.seller,
      getUSDCAddress(validatedData.chainId),
      validatedData.amount,
      validatedData.itemDescription,
      validatedData.expiryDuration || 0,
    ]);

    // Calculate fee
    const fee = await escrow.calculateFee(validatedData.amount);

    res.json({
      success: true,
      transaction: {
        to: escrowAddress,
        data: txData,
        value: '0',
      },
      details: {
        amount: validatedData.amount,
        platformFee: fee.toString(),
        sellerReceives: (BigInt(validatedData.amount) - fee).toString(),
      },
    });
  } catch (error) {
    logger.error('Failed to prepare create trade', { error });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to prepare transaction',
    });
  }
});

/**
 * @route POST /api/trades/prepare-confirm
 * @description Prepare transaction data for confirming delivery
 */
router.post('/prepare-confirm', async (req: Request, res: Response) => {
  try {
    const { tradeId, rating, chainId } = req.body;

    if (!tradeId || !rating || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'tradeId, rating, and chainId are required',
      });
    }

    const escrow = getEscrowContract(chainId);
    const escrowAddress = await escrow.getAddress();

    const txData = escrow.interface.encodeFunctionData('confirmDelivery', [
      tradeId,
      rating, // 100-500 (1.0-5.0 stars)
    ]);

    res.json({
      success: true,
      transaction: {
        to: escrowAddress,
        data: txData,
        value: '0',
      },
    });
  } catch (error) {
    logger.error('Failed to prepare confirm delivery', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to prepare transaction',
    });
  }
});

/**
 * @route GET /api/trades/stats
 * @description Get marketplace statistics
 */
router.get('/stats/global', async (req: Request, res: Response) => {
  try {
    const chainId = parseInt(req.query.chainId as string) || 137;

    // In production, these would come from The Graph or database
    // For now, return placeholder stats
    res.json({
      success: true,
      stats: {
        totalTrades: 0,
        totalVolume: '0',
        activeTrades: 0,
        averageTradeSize: '0',
        disputeRate: 0,
        chainId,
      },
    });
  } catch (error) {
    logger.error('Failed to get stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
    });
  }
});

// Helper functions
function formatTrade(trade: any, tradeId: string) {
  return {
    tradeId,
    buyer: trade.buyer,
    seller: trade.seller,
    paymentToken: trade.paymentToken,
    amount: trade.amount.toString(),
    platformFee: trade.platformFee.toString(),
    createdAt: new Date(Number(trade.createdAt) * 1000).toISOString(),
    expiresAt: new Date(Number(trade.expiresAt) * 1000).toISOString(),
    deliveredAt: trade.deliveredAt > 0 
      ? new Date(Number(trade.deliveredAt) * 1000).toISOString() 
      : null,
    completedAt: trade.completedAt > 0 
      ? new Date(Number(trade.completedAt) * 1000).toISOString() 
      : null,
    status: getStatusName(trade.status),
    statusCode: Number(trade.status),
    itemDescription: trade.itemDescription,
    deliveryProof: trade.deliveryProof,
    buyerRating: Number(trade.buyerRating),
    sellerRating: Number(trade.sellerRating),
  };
}

function getStatusName(status: number): string {
  const statuses = [
    'None',
    'Created',
    'SellerAccepted',
    'Delivered',
    'Completed',
    'Disputed',
    'Resolved',
    'Cancelled',
    'Expired',
  ];
  return statuses[status] || 'Unknown';
}

function getUSDCAddress(chainId: number): string {
  const addresses: Record<number, string> = {
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
  };
  return addresses[chainId] || addresses[137];
}

export { router as tradeRouter };

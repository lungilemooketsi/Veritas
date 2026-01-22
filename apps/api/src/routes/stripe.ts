import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Validation schemas
const createOnrampSessionSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.number().min(10).max(10000), // Min $10, Max $10,000
  currency: z.enum(['usd', 'eur', 'gbp']).default('usd'),
  destinationNetwork: z.enum(['polygon', 'arbitrum', 'ethereum']).default('polygon'),
  destinationCurrency: z.enum(['usdc', 'usdt']).default('usdc'),
});

const checkOnrampStatusSchema = z.object({
  sessionId: z.string(),
});

/**
 * @route POST /api/stripe/onramp/session
 * @description Create a Stripe Crypto Onramp session
 * @body { walletAddress, amount, currency, destinationNetwork, destinationCurrency }
 */
router.post('/onramp/session', async (req: Request, res: Response) => {
  try {
    const validatedData = createOnrampSessionSchema.parse(req.body);
    
    logger.info('Creating onramp session', { 
      walletAddress: validatedData.walletAddress,
      amount: validatedData.amount,
    });

    // Get network-specific configuration
    const networkConfig = getNetworkConfig(validatedData.destinationNetwork);

    // Create Stripe Crypto Onramp Session
    // Note: This uses Stripe's Crypto Onramp API
    const session = await stripe.crypto.onrampSessions.create({
      wallet_addresses: {
        [validatedData.destinationNetwork]: validatedData.walletAddress,
      },
      destination_amount: validatedData.amount.toString(),
      destination_currency: validatedData.destinationCurrency,
      destination_network: validatedData.destinationNetwork,
      source_currency: validatedData.currency,
      lock_wallet_address: true,
      // Optional: set return URL for redirect flow
      // return_url: `${process.env.NEXT_PUBLIC_APP_URL}/onramp/complete`,
    } as any);

    res.json({
      success: true,
      sessionId: session.id,
      clientSecret: session.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      status: session.status,
    });
  } catch (error) {
    logger.error('Failed to create onramp session', { error });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create onramp session',
    });
  }
});

/**
 * @route GET /api/stripe/onramp/session/:sessionId
 * @description Get the status of an onramp session
 */
router.get('/onramp/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await (stripe.crypto as any).onrampSessions.retrieve(sessionId);

    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        destination_amount: session.destination_amount,
        destination_currency: session.destination_currency,
        destination_network: session.destination_network,
        wallet_address: session.wallet_addresses,
        transaction_details: session.transaction_details,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve onramp session', { error });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session status',
    });
  }
});

/**
 * @route GET /api/stripe/onramp/quotes
 * @description Get crypto onramp price quotes
 */
router.get('/onramp/quotes', async (req: Request, res: Response) => {
  try {
    const { amount, sourceCurrency = 'usd', destinationCurrency = 'usdc' } = req.query;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required',
      });
    }

    // Get quote from Stripe
    const quote = await (stripe.crypto as any).onrampQuotes.create({
      source_amount: amount,
      source_currency: sourceCurrency,
      destination_currency: destinationCurrency,
      destination_networks: ['polygon', 'arbitrum'],
    });

    res.json({
      success: true,
      quote: {
        source_amount: quote.source_amount,
        destination_amount: quote.destination_amount,
        exchange_rate: quote.exchange_rate,
        fees: quote.fees,
        expires_at: quote.expires_at,
      },
    });
  } catch (error) {
    logger.error('Failed to get onramp quote', { error });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get quote',
    });
  }
});

/**
 * @route GET /api/stripe/onramp/supported
 * @description Get supported currencies and networks
 */
router.get('/onramp/supported', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    supported: {
      sourceCurrencies: ['usd', 'eur', 'gbp'],
      destinationCurrencies: ['usdc', 'usdt'],
      networks: [
        {
          id: 'polygon',
          name: 'Polygon',
          chainId: 137,
          minAmount: 10,
          maxAmount: 10000,
          estimatedTime: '2-5 minutes',
        },
        {
          id: 'arbitrum',
          name: 'Arbitrum One',
          chainId: 42161,
          minAmount: 10,
          maxAmount: 10000,
          estimatedTime: '2-5 minutes',
        },
        {
          id: 'ethereum',
          name: 'Ethereum',
          chainId: 1,
          minAmount: 50,
          maxAmount: 10000,
          estimatedTime: '5-10 minutes',
        },
      ],
    },
  });
});

// Helper function to get network-specific configuration
function getNetworkConfig(network: string) {
  const configs: Record<string, { chainId: number; usdcAddress: string }> = {
    polygon: {
      chainId: 137,
      usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    },
    arbitrum: {
      chainId: 42161,
      usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    ethereum: {
      chainId: 1,
      usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  };
  
  return configs[network] || configs.polygon;
}

export { router as stripeRouter };

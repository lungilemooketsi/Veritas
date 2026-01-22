import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import express from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * @route POST /webhooks/stripe
 * @description Handle Stripe webhooks for crypto onramp events
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      logger.error('Webhook signature verification failed', { error: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info('Received Stripe webhook', { type: event.type });

    try {
      switch (event.type) {
        case 'crypto.onramp_session.completed':
          await handleOnrampCompleted(event.data.object as any);
          break;

        case 'crypto.onramp_session.updated':
          await handleOnrampUpdated(event.data.object as any);
          break;

        case 'crypto.onramp_session.failed':
          await handleOnrampFailed(event.data.object as any);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Error processing webhook', { error });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

/**
 * Handle successful crypto onramp completion
 */
async function handleOnrampCompleted(session: any) {
  logger.info('Onramp session completed', {
    sessionId: session.id,
    walletAddress: session.wallet_addresses,
    amount: session.destination_amount,
    currency: session.destination_currency,
    network: session.destination_network,
  });

  // In production, you would:
  // 1. Update user's balance in your database
  // 2. Send notification to user
  // 3. Trigger any post-funding workflows
  
  // Example: Track successful funding
  const trackingData = {
    eventType: 'onramp_completed',
    sessionId: session.id,
    walletAddress: Object.values(session.wallet_addresses)[0],
    amount: session.destination_amount,
    currency: session.destination_currency,
    network: session.destination_network,
    timestamp: new Date().toISOString(),
  };

  logger.info('Tracking onramp completion', trackingData);

  // Store in database or send to analytics
  // await db.onrampEvents.create({ data: trackingData });
}

/**
 * Handle onramp session status updates
 */
async function handleOnrampUpdated(session: any) {
  logger.info('Onramp session updated', {
    sessionId: session.id,
    status: session.status,
  });

  // Track status progression
  // Statuses: initialized → pending → processing → completed
}

/**
 * Handle failed onramp attempts
 */
async function handleOnrampFailed(session: any) {
  logger.warn('Onramp session failed', {
    sessionId: session.id,
    failure_reason: session.failure_reason,
  });

  // In production:
  // 1. Log failure reason
  // 2. Notify user
  // 3. Track for analytics
}

/**
 * @route POST /webhooks/chainlink
 * @description Handle Chainlink CCIP message delivery confirmations
 */
router.post(
  '/chainlink',
  express.json(),
  async (req: Request, res: Response) => {
    try {
      const { messageId, sourceChainSelector, sender, data } = req.body;

      logger.info('Received Chainlink CCIP webhook', {
        messageId,
        sourceChainSelector,
        sender,
      });

      // Process cross-chain message delivery confirmation
      // This would typically update UI state or trigger notifications

      res.json({ received: true });
    } catch (error) {
      logger.error('Error processing Chainlink webhook', { error });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

/**
 * @route POST /webhooks/graph
 * @description Handle The Graph webhook for new data indexed
 */
router.post(
  '/graph',
  express.json(),
  async (req: Request, res: Response) => {
    try {
      const { entity, data, blockNumber } = req.body;

      logger.info('Received Graph webhook', {
        entity,
        blockNumber,
      });

      // Process indexed data notifications
      // Useful for real-time UI updates

      res.json({ received: true });
    } catch (error) {
      logger.error('Error processing Graph webhook', { error });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

export { router as webhookRouter };

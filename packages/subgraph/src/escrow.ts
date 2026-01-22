import { BigInt, BigDecimal, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  TradeCreated,
  TradeAccepted,
  TradeDelivered,
  TradeCompleted,
  TradeCancelled,
  TradeExpired,
  DisputeRaised,
  DisputeResolved,
  TradeRated,
} from "../generated/VeritasEscrow/VeritasEscrow";
import { Trade, Dispute, User, MarketplaceStats, DailyStats } from "../generated/schema";
import { getOrCreateUser, updateDailyStats, getOrCreateGlobalStats } from "./helpers";

// Constants
const ZERO_BD = BigDecimal.fromString("0");
const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const USDC_DECIMALS = BigInt.fromI32(6);

function toDecimal(value: BigInt, decimals: BigInt): BigDecimal {
  let divisor = BigInt.fromI32(10).pow(decimals.toI32() as u8);
  return value.toBigDecimal().div(divisor.toBigDecimal());
}

export function handleTradeCreated(event: TradeCreated): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = new Trade(tradeId);

  // Get or create users
  let buyer = getOrCreateUser(event.params.buyer, event.block.timestamp);
  let seller = getOrCreateUser(event.params.seller, event.block.timestamp);

  trade.buyer = buyer.id;
  trade.seller = seller.id;
  trade.paymentToken = event.params.paymentToken;
  trade.amount = toDecimal(event.params.amount, USDC_DECIMALS);
  trade.platformFee = ZERO_BD; // Will be set on completion
  trade.status = "Created";
  trade.itemDescription = ""; // Would need to fetch from contract or use indexed param
  trade.createdAt = event.block.timestamp;
  trade.expiresAt = event.params.expiresAt;
  trade.creationTxHash = event.transaction.hash;

  trade.save();

  // Update user stats
  buyer.totalTradesAsBuyer = buyer.totalTradesAsBuyer.plus(ONE_BI);
  buyer.save();

  seller.totalTradesAsSeller = seller.totalTradesAsSeller.plus(ONE_BI);
  seller.save();

  // Update global stats
  let stats = getOrCreateGlobalStats();
  stats.totalTrades = stats.totalTrades.plus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  // Update daily stats
  updateDailyStats(event.block.timestamp, "tradesCreated", ONE_BI, ZERO_BD);
}

export function handleTradeAccepted(event: TradeAccepted): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  
  if (trade) {
    trade.status = "SellerAccepted";
    trade.acceptedAt = event.block.timestamp;
    trade.save();
  }
}

export function handleTradeDelivered(event: TradeDelivered): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  
  if (trade) {
    trade.status = "Delivered";
    trade.deliveredAt = event.block.timestamp;
    trade.deliveryProof = event.params.deliveryProof;
    trade.save();
  }
}

export function handleTradeCompleted(event: TradeCompleted): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  
  if (trade) {
    let sellerAmount = toDecimal(event.params.sellerAmount, USDC_DECIMALS);
    let platformFee = toDecimal(event.params.platformFeeAmount, USDC_DECIMALS);
    
    trade.status = "Completed";
    trade.completedAt = event.block.timestamp;
    trade.sellerReceived = sellerAmount;
    trade.platformFee = platformFee;
    trade.completionTxHash = event.transaction.hash;
    trade.save();

    // Update user stats
    let seller = User.load(trade.seller);
    if (seller) {
      seller.successfulTrades = seller.successfulTrades.plus(ONE_BI);
      seller.totalVolumeTraded = seller.totalVolumeTraded.plus(sellerAmount);
      seller.lastTradeAt = event.block.timestamp;
      seller.save();
    }

    let buyer = User.load(trade.buyer);
    if (buyer) {
      buyer.successfulTrades = buyer.successfulTrades.plus(ONE_BI);
      buyer.totalVolumeTraded = buyer.totalVolumeTraded.plus(trade.amount);
      buyer.lastTradeAt = event.block.timestamp;
      buyer.save();
    }

    // Update global stats
    let stats = getOrCreateGlobalStats();
    stats.totalCompletedTrades = stats.totalCompletedTrades.plus(ONE_BI);
    stats.totalVolume = stats.totalVolume.plus(trade.amount);
    stats.totalFees = stats.totalFees.plus(platformFee);
    stats.averageTradeSize = stats.totalVolume.div(stats.totalCompletedTrades.toBigDecimal());
    stats.lastUpdated = event.block.timestamp;
    stats.save();

    // Update daily stats
    updateDailyStats(event.block.timestamp, "tradesCompleted", ONE_BI, trade.amount);
  }
}

export function handleTradeCancelled(event: TradeCancelled): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  
  if (trade) {
    trade.status = "Cancelled";
    trade.cancelledAt = event.block.timestamp;
    trade.save();
  }
}

export function handleTradeExpired(event: TradeExpired): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  
  if (trade) {
    trade.status = "Expired";
    trade.save();
  }
}

export function handleDisputeRaised(event: DisputeRaised): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  
  if (trade) {
    trade.status = "Disputed";
    trade.save();

    // Create dispute entity
    let dispute = new Dispute(tradeId);
    dispute.trade = tradeId;
    dispute.initiator = event.params.initiator.toHexString();
    dispute.reason = event.params.reason;
    dispute.initiatedAt = event.block.timestamp;
    dispute.isResolved = false;
    dispute.save();

    // Update daily stats
    updateDailyStats(event.block.timestamp, "disputes", ONE_BI, ZERO_BD);
  }
}

export function handleDisputeResolved(event: DisputeResolved): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  let dispute = Dispute.load(tradeId);
  
  if (trade && dispute) {
    trade.status = "Resolved";
    trade.save();

    dispute.winner = event.params.winner.toHexString();
    dispute.resolvedAt = event.block.timestamp;
    dispute.isResolved = true;
    dispute.amountAwarded = toDecimal(event.params.amount, USDC_DECIMALS);
    dispute.save();
  }
}

export function handleTradeRated(event: TradeRated): void {
  let tradeId = event.params.tradeId.toHexString();
  let trade = Trade.load(tradeId);
  
  if (trade) {
    let rater = event.params.rater.toHexString();
    let rating = event.params.rating.toI32();
    
    if (rater == trade.buyer) {
      trade.buyerRating = rating;
    } else if (rater == trade.seller) {
      trade.sellerRating = rating;
    }
    
    trade.save();
  }
}

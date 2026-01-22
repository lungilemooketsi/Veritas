import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";
import {
  ReputationUpdated,
  TradeRecorded,
  DisputeResolved as DisputeResolvedReputation,
  BadgeThresholdMet,
  CrossChainReputationSynced,
} from "../generated/ReputationEngine/ReputationEngine";
import { User, ReputationUpdate, CrossChainSync } from "../generated/schema";
import { getOrCreateUser } from "./helpers";

const ZERO_BD = BigDecimal.fromString("0");
const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const RATING_SCALE = BigDecimal.fromString("100");

export function handleReputationUpdated(event: ReputationUpdated): void {
  let user = getOrCreateUser(event.params.user, event.block.timestamp);
  
  // Create reputation update record
  let updateId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let update = new ReputationUpdate(updateId);
  
  update.user = user.id;
  update.previousTrades = user.successfulTrades;
  update.previousRating = user.averageRating;
  update.newTrades = event.params.newTrades;
  update.newRating = event.params.newRating.toBigDecimal().div(RATING_SCALE);
  update.timestamp = event.params.timestamp;
  update.txHash = event.transaction.hash;
  update.blockNumber = event.block.number;
  update.save();

  // Update user
  user.successfulTrades = event.params.newTrades;
  user.averageRating = update.newRating;
  user.save();
}

export function handleTradeRecorded(event: TradeRecorded): void {
  // Update seller
  let seller = getOrCreateUser(event.params.seller, event.block.timestamp);
  let sellerRating = event.params.sellerRating.toBigDecimal().div(RATING_SCALE);
  
  seller.totalRatingPoints = seller.totalRatingPoints.plus(event.params.sellerRating);
  seller.ratingCount = seller.ratingCount.plus(ONE_BI);
  seller.averageRating = seller.totalRatingPoints.toBigDecimal()
    .div(seller.ratingCount.toBigDecimal())
    .div(RATING_SCALE);
  seller.save();

  // Update buyer
  let buyer = getOrCreateUser(event.params.buyer, event.block.timestamp);
  let buyerRating = event.params.buyerRating.toBigDecimal().div(RATING_SCALE);
  
  buyer.totalRatingPoints = buyer.totalRatingPoints.plus(event.params.buyerRating);
  buyer.ratingCount = buyer.ratingCount.plus(ONE_BI);
  buyer.averageRating = buyer.totalRatingPoints.toBigDecimal()
    .div(buyer.ratingCount.toBigDecimal())
    .div(RATING_SCALE);
  buyer.save();
}

export function handleDisputeResolvedReputation(event: DisputeResolvedReputation): void {
  let winner = getOrCreateUser(event.params.winner, event.block.timestamp);
  winner.disputesWon = winner.disputesWon.plus(ONE_BI);
  winner.save();

  let loser = getOrCreateUser(event.params.loser, event.block.timestamp);
  loser.disputesLost = loser.disputesLost.plus(ONE_BI);
  loser.save();
}

export function handleBadgeThresholdMet(event: BadgeThresholdMet): void {
  let user = getOrCreateUser(event.params.user, event.block.timestamp);
  
  // Update highest badge tier
  let tier = event.params.tier;
  user.highestBadgeTier = tierToString(tier);
  user.save();
}

export function handleCrossChainSync(event: CrossChainReputationSynced): void {
  let user = getOrCreateUser(event.params.user, event.block.timestamp);
  
  // Create sync record
  let syncId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let sync = new CrossChainSync(syncId);
  
  sync.user = user.id;
  sync.sourceChainId = BigInt.fromI64(event.params.sourceChain);
  sync.tradesAdded = event.params.trades;
  sync.ratingAdded = event.params.rating.toBigDecimal().div(RATING_SCALE);
  sync.timestamp = event.block.timestamp;
  sync.txHash = event.transaction.hash;
  sync.save();

  // Update user cross-chain stats
  user.crossChainTrades = user.crossChainTrades.plus(event.params.trades);
  user.save();
}

function tierToString(tier: i32): string {
  switch (tier) {
    case 0: return "None";
    case 1: return "Bronze";
    case 2: return "Silver";
    case 3: return "Gold";
    case 4: return "Platinum";
    case 5: return "Diamond";
    default: return "None";
  }
}

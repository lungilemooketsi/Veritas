import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
  BadgeMinted,
  BadgeUpgraded,
  Locked,
} from "../generated/VeritasSoulboundBadge/VeritasSoulboundBadge";
import { Badge, User } from "../generated/schema";
import { getOrCreateUser, getOrCreateGlobalStats, updateDailyStats } from "./helpers";

const ZERO_BD = BigDecimal.fromString("0");
const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const RATING_SCALE = BigDecimal.fromString("100");

export function handleBadgeMinted(event: BadgeMinted): void {
  let tokenId = event.params.tokenId.toString();
  let badge = new Badge(tokenId);
  
  badge.tokenId = event.params.tokenId;
  badge.owner = event.params.recipient.toHexString();
  badge.tier = tierToString(event.params.tier);
  badge.tradesAtMint = event.params.trades;
  badge.ratingAtMint = event.params.rating.toBigDecimal().div(RATING_SCALE);
  badge.mintedAt = event.block.timestamp;
  badge.mintTxHash = event.transaction.hash;
  badge.sourceChainId = ZERO_BI; // Will be updated from metadata
  badge.isLocked = true; // EIP-5192: always locked
  badge.save();

  // Update user
  let user = getOrCreateUser(event.params.recipient, event.block.timestamp);
  user.highestBadgeTier = badge.tier;
  user.save();

  // Update global stats
  let stats = getOrCreateGlobalStats();
  stats.totalBadgesMinted = stats.totalBadgesMinted.plus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  // Update daily stats
  updateDailyStats(event.block.timestamp, "badgesMinted", ONE_BI, ZERO_BD);
}

export function handleBadgeUpgraded(event: BadgeUpgraded): void {
  let user = getOrCreateUser(event.params.holder, event.block.timestamp);
  user.highestBadgeTier = tierToString(event.params.newTier);
  user.save();
}

export function handleLocked(event: Locked): void {
  let tokenId = event.params.tokenId.toString();
  let badge = Badge.load(tokenId);
  
  if (badge) {
    badge.isLocked = true;
    badge.save();
  }
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

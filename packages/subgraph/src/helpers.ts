import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";
import { User, MarketplaceStats, DailyStats } from "../generated/schema";

const ZERO_BD = BigDecimal.fromString("0");
const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const DAY_SECONDS = BigInt.fromI32(86400);

export function getOrCreateUser(address: Address, timestamp: BigInt): User {
  let id = address.toHexString();
  let user = User.load(id);

  if (!user) {
    user = new User(id);
    user.totalTradesAsBuyer = ZERO_BI;
    user.totalTradesAsSeller = ZERO_BI;
    user.successfulTrades = ZERO_BI;
    user.averageRating = ZERO_BD;
    user.totalRatingPoints = ZERO_BI;
    user.ratingCount = ZERO_BI;
    user.disputesWon = ZERO_BI;
    user.disputesLost = ZERO_BI;
    user.highestBadgeTier = "None";
    user.joinedAt = timestamp;
    user.totalVolumeTraded = ZERO_BD;
    user.crossChainTrades = ZERO_BI;
    user.primaryChainId = BigInt.fromI32(137); // Polygon by default

    // Update global user count
    let stats = getOrCreateGlobalStats();
    stats.totalUsers = stats.totalUsers.plus(ONE_BI);
    stats.save();

    // Update daily stats
    updateDailyStats(timestamp, "newUsers", ONE_BI, ZERO_BD);
  }

  return user;
}

export function getOrCreateGlobalStats(): MarketplaceStats {
  let id = "global";
  let stats = MarketplaceStats.load(id);

  if (!stats) {
    stats = new MarketplaceStats(id);
    stats.totalTrades = ZERO_BI;
    stats.totalCompletedTrades = ZERO_BI;
    stats.totalVolume = ZERO_BD;
    stats.totalFees = ZERO_BD;
    stats.totalUsers = ZERO_BI;
    stats.totalBadgesMinted = ZERO_BI;
    stats.averageTradeSize = ZERO_BD;
    stats.disputeRate = ZERO_BD;
    stats.lastUpdated = ZERO_BI;
  }

  return stats;
}

export function updateDailyStats(
  timestamp: BigInt,
  field: string,
  intValue: BigInt,
  decimalValue: BigDecimal
): void {
  let dayId = timestamp.div(DAY_SECONDS).toString();
  let dayStartTimestamp = timestamp.div(DAY_SECONDS).times(DAY_SECONDS);
  
  let daily = DailyStats.load(dayId);

  if (!daily) {
    daily = new DailyStats(dayId);
    daily.date = dayStartTimestamp;
    daily.tradesCreated = ZERO_BI;
    daily.tradesCompleted = ZERO_BI;
    daily.volume = ZERO_BD;
    daily.fees = ZERO_BD;
    daily.newUsers = ZERO_BI;
    daily.badgesMinted = ZERO_BI;
    daily.disputes = ZERO_BI;
  }

  if (field == "tradesCreated") {
    daily.tradesCreated = daily.tradesCreated.plus(intValue);
  } else if (field == "tradesCompleted") {
    daily.tradesCompleted = daily.tradesCompleted.plus(intValue);
    daily.volume = daily.volume.plus(decimalValue);
  } else if (field == "newUsers") {
    daily.newUsers = daily.newUsers.plus(intValue);
  } else if (field == "badgesMinted") {
    daily.badgesMinted = daily.badgesMinted.plus(intValue);
  } else if (field == "disputes") {
    daily.disputes = daily.disputes.plus(intValue);
  } else if (field == "fees") {
    daily.fees = daily.fees.plus(decimalValue);
  }

  daily.save();
}

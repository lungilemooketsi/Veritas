import { useQuery } from '@tanstack/react-query';

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'http://localhost:8000/subgraphs/name/veritas';

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

async function fetchGraphQL<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const json: GraphQLResponse<T> = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  return json.data;
}

// User queries
const USER_QUERY = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      totalTrades
      successfulTrades
      totalRating
      averageRating
      currentBadgeTier
      trustScore
      createdAt
      badges {
        id
        tier
        tokenId
        mintedAt
      }
      tradesAsSeller {
        id
        status
        amount
        createdAt
      }
      tradesAsBuyer {
        id
        status
        amount
        createdAt
      }
    }
  }
`;

export function useUser(address: string | undefined) {
  return useQuery({
    queryKey: ['user', address],
    queryFn: () => fetchGraphQL<{ user: any }>(USER_QUERY, { id: address?.toLowerCase() }),
    enabled: !!address,
    staleTime: 30_000,
  });
}

// Trades queries
const TRADES_QUERY = `
  query GetTrades($first: Int!, $skip: Int!, $status: TradeStatus) {
    trades(
      first: $first
      skip: $skip
      where: { status: $status }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      seller {
        id
        averageRating
        totalTrades
        currentBadgeTier
      }
      buyer {
        id
      }
      tokenAddress
      amount
      price
      status
      createdAt
      expiresAt
    }
  }
`;

export function useTrades(options?: { first?: number; skip?: number; status?: string }) {
  const { first = 20, skip = 0, status } = options || {};

  return useQuery({
    queryKey: ['trades', first, skip, status],
    queryFn: () => fetchGraphQL<{ trades: any[] }>(TRADES_QUERY, { first, skip, status }),
    staleTime: 10_000,
  });
}

// Single trade query
const TRADE_QUERY = `
  query GetTrade($id: ID!) {
    trade(id: $id) {
      id
      seller {
        id
        averageRating
        totalTrades
        currentBadgeTier
      }
      buyer {
        id
        averageRating
        totalTrades
      }
      tokenAddress
      amount
      price
      status
      createdAt
      acceptedAt
      completedAt
      expiresAt
      dispute {
        id
        reason
        status
        resolution
        resolvedAt
      }
    }
  }
`;

export function useTrade(tradeId: string | undefined) {
  return useQuery({
    queryKey: ['trade', tradeId],
    queryFn: () => fetchGraphQL<{ trade: any }>(TRADE_QUERY, { id: tradeId }),
    enabled: !!tradeId,
    staleTime: 5_000,
  });
}

// Leaderboard query
const LEADERBOARD_QUERY = `
  query GetLeaderboard($first: Int!) {
    users(
      first: $first
      orderBy: totalTrades
      orderDirection: desc
      where: { totalTrades_gt: 0 }
    ) {
      id
      totalTrades
      averageRating
      currentBadgeTier
      trustScore
    }
  }
`;

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => fetchGraphQL<{ users: any[] }>(LEADERBOARD_QUERY, { first: limit }),
    staleTime: 60_000,
  });
}

// Marketplace stats query
const STATS_QUERY = `
  query GetStats {
    marketplaceStats(id: "global") {
      totalTrades
      totalVolume
      totalUsers
      totalDisputes
      resolvedDisputes
      activeTrades
    }
  }
`;

export function useMarketplaceStats() {
  return useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: () => fetchGraphQL<{ marketplaceStats: any }>(STATS_QUERY),
    staleTime: 30_000,
  });
}

// User badges query
const USER_BADGES_QUERY = `
  query GetUserBadges($userId: ID!) {
    badges(where: { owner: $userId }) {
      id
      tier
      tokenId
      mintedAt
      chain
    }
  }
`;

export function useUserBadges(address: string | undefined) {
  return useQuery({
    queryKey: ['user-badges', address],
    queryFn: () => fetchGraphQL<{ badges: any[] }>(USER_BADGES_QUERY, { userId: address?.toLowerCase() }),
    enabled: !!address,
    staleTime: 60_000,
  });
}

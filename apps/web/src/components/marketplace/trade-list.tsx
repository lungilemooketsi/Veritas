'use client';

import { useState, useEffect } from 'react';
import { Trade, TradeType } from './marketplace-content';
import { TradeCard } from './trade-card';
import { Loader2 } from 'lucide-react';

interface TradeListProps {
  tradeType: TradeType;
  selectedToken: string;
}

// Mock data for demonstration
const MOCK_TRADES: Trade[] = [
  {
    id: '1',
    seller: '0x1234...5678',
    tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    tokenSymbol: 'USDC',
    amount: '10000',
    pricePerToken: '1.02',
    paymentMethods: ['bank', 'paypal'],
    minAmount: '100',
    maxAmount: '5000',
    reputation: {
      trades: 156,
      rating: 4.92,
      badge: 'Platinum',
    },
    status: 'active',
  },
  {
    id: '2',
    seller: '0xabcd...efgh',
    tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    tokenSymbol: 'USDC',
    amount: '5000',
    pricePerToken: '1.01',
    paymentMethods: ['bank', 'card'],
    minAmount: '50',
    maxAmount: '2500',
    reputation: {
      trades: 89,
      rating: 4.85,
      badge: 'Gold',
    },
    status: 'active',
  },
  {
    id: '3',
    seller: '0x9876...5432',
    tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    tokenSymbol: 'USDC',
    amount: '25000',
    pricePerToken: '1.015',
    paymentMethods: ['bank'],
    minAmount: '500',
    maxAmount: '10000',
    reputation: {
      trades: 312,
      rating: 4.97,
      badge: 'Diamond',
    },
    status: 'active',
  },
  {
    id: '4',
    seller: '0xfedc...ba98',
    tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    tokenSymbol: 'USDC',
    amount: '2000',
    pricePerToken: '1.03',
    paymentMethods: ['paypal', 'card'],
    minAmount: '25',
    maxAmount: '1000',
    reputation: {
      trades: 34,
      rating: 4.65,
      badge: 'Silver',
    },
    status: 'active',
  },
];

export function TradeList({ tradeType, selectedToken }: TradeListProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchTrades = async () => {
      setIsLoading(true);
      // In production, fetch from subgraph
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTrades(MOCK_TRADES.filter(t => t.tokenSymbol === selectedToken));
      setIsLoading(false);
    };

    fetchTrades();
  }, [selectedToken, tradeType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border">
        <p className="text-muted-foreground">No trades available for {selectedToken}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Be the first to create a trade!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-6 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
        <div>Seller</div>
        <div>Available</div>
        <div>Price</div>
        <div>Limits</div>
        <div>Payment</div>
        <div className="text-right">Action</div>
      </div>

      {/* Trade Cards */}
      {trades.map((trade) => (
        <TradeCard key={trade.id} trade={trade} tradeType={tradeType} />
      ))}
    </div>
  );
}

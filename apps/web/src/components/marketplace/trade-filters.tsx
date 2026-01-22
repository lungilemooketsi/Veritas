'use client';

import { TradeType } from './marketplace-content';
import { Button } from '@/components/ui/button';

interface TradeFiltersProps {
  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  selectedToken: string;
  setSelectedToken: (token: string) => void;
}

const TOKENS = [
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'DAI', name: 'Dai' },
  { symbol: 'ETH', name: 'Ethereum' },
];

export function TradeFilters({
  tradeType,
  setTradeType,
  selectedToken,
  setSelectedToken,
}: TradeFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Buy/Sell Toggle */}
      <div className="flex bg-secondary rounded-lg p-1">
        <button
          onClick={() => setTradeType('buy')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tradeType === 'buy'
              ? 'bg-green-500 text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Buy Crypto
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tradeType === 'sell'
              ? 'bg-red-500 text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sell Crypto
        </button>
      </div>

      {/* Token Filter */}
      <div className="flex gap-2">
        {TOKENS.map((token) => (
          <button
            key={token.symbol}
            onClick={() => setSelectedToken(token.symbol)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              selectedToken === token.symbol
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {token.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

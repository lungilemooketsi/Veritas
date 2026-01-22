'use client';

import { useState } from 'react';
import { TradeFilters } from './trade-filters';
import { TradeList } from './trade-list';
import { CreateTradeModal } from './create-trade-modal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAccount } from 'wagmi';

export type TradeType = 'buy' | 'sell';
export type PaymentMethod = 'bank' | 'card' | 'paypal' | 'crypto';

export interface Trade {
  id: string;
  seller: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  pricePerToken: string;
  paymentMethods: PaymentMethod[];
  minAmount: string;
  maxAmount: string;
  reputation: {
    trades: number;
    rating: number;
    badge: string;
  };
  status: 'active' | 'pending' | 'completed';
}

export function MarketplaceContent() {
  const { isConnected } = useAccount();
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [selectedToken, setSelectedToken] = useState<string>('USDC');
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <TradeFilters
          tradeType={tradeType}
          setTradeType={setTradeType}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
        />
        
        {isConnected && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Trade
          </Button>
        )}
      </div>

      {/* Trade List */}
      <TradeList
        tradeType={tradeType}
        selectedToken={selectedToken}
      />

      {/* Create Trade Modal */}
      <CreateTradeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

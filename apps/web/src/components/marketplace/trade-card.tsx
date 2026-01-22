'use client';

import { Trade, TradeType } from './marketplace-content';
import { Button } from '@/components/ui/button';
import { BadgeIcon } from '@/components/reputation/badge-icon';
import { Star, Building2, CreditCard, Wallet } from 'lucide-react';

interface TradeCardProps {
  trade: Trade;
  tradeType: TradeType;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  bank: <Building2 className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  paypal: <span className="text-xs font-bold">PP</span>,
  crypto: <Wallet className="h-4 w-4" />,
};

const PAYMENT_LABELS: Record<string, string> = {
  bank: 'Bank Transfer',
  card: 'Card',
  paypal: 'PayPal',
  crypto: 'Crypto',
};

export function TradeCard({ trade, tradeType }: TradeCardProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(parseFloat(trade.amount));

  const formattedMin = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(parseFloat(trade.minAmount));

  const formattedMax = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(parseFloat(trade.maxAmount));

  return (
    <div className="bg-card border rounded-xl p-4 hover:border-primary/50 transition-colors">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
        {/* Seller Info */}
        <div className="flex items-center gap-3">
          <BadgeIcon tier={trade.reputation.badge} size="sm" />
          <div>
            <div className="font-medium text-sm">{trade.seller}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>{trade.reputation.rating.toFixed(2)}</span>
              <span>•</span>
              <span>{trade.reputation.trades} trades</span>
            </div>
          </div>
        </div>

        {/* Available Amount */}
        <div>
          <div className="font-semibold">
            {formattedAmount} {trade.tokenSymbol}
          </div>
          <div className="text-xs text-muted-foreground md:hidden">
            Available
          </div>
        </div>

        {/* Price */}
        <div>
          <div className="font-semibold text-green-600">
            ${trade.pricePerToken}
          </div>
          <div className="text-xs text-muted-foreground">per {trade.tokenSymbol}</div>
        </div>

        {/* Limits */}
        <div>
          <div className="text-sm">
            {formattedMin} - {formattedMax}
          </div>
          <div className="text-xs text-muted-foreground md:hidden">
            Limits
          </div>
        </div>

        {/* Payment Methods */}
        <div className="flex flex-wrap gap-2">
          {trade.paymentMethods.map((method) => (
            <div
              key={method}
              className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs"
              title={PAYMENT_LABELS[method]}
            >
              {PAYMENT_ICONS[method]}
              <span className="hidden sm:inline">{PAYMENT_LABELS[method]}</span>
            </div>
          ))}
        </div>

        {/* Action */}
        <div className="col-span-2 md:col-span-1 md:text-right">
          <Button
            className={tradeType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {tradeType === 'buy' ? 'Buy' : 'Sell'} {trade.tokenSymbol}
          </Button>
        </div>
      </div>
    </div>
  );
}

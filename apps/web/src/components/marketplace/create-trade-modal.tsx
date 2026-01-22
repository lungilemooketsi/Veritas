'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface CreateTradeModalProps {
  open: boolean;
  onClose: () => void;
}

const TOKENS = [
  { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
  { symbol: 'USDT', name: 'Tether', address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' },
];

const PAYMENT_METHODS = [
  { id: 'bank', name: 'Bank Transfer' },
  { id: 'card', name: 'Credit/Debit Card' },
  { id: 'paypal', name: 'PayPal' },
];

export function CreateTradeModal({ open, onClose }: CreateTradeModalProps) {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    token: TOKENS[0].address,
    amount: '',
    price: '',
    minAmount: '',
    maxAmount: '',
    paymentMethods: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In production, this would call the contract
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trades/prepare-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller: address,
          ...formData,
        }),
      });

      const data = await response.json();
      console.log('Transaction prepared:', data);
      
      // Would then send transaction with wagmi
      onClose();
    } catch (error) {
      console.error('Failed to create trade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePaymentMethod = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(id)
        ? prev.paymentMethods.filter((m) => m !== id)
        : [...prev.paymentMethods, id],
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Trade Listing</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Token Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Token to Sell</label>
            <select
              value={formData.token}
              onChange={(e) => setFormData({ ...formData, token: e.target.value })}
              className="w-full p-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TOKENS.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium mb-2 block">Amount to Sell</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full p-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label className="text-sm font-medium mb-2 block">Price per Token (USD)</label>
            <input
              type="number"
              step="0.001"
              placeholder="e.g., 1.02"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full p-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Min/Max Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Min Order (USD)</label>
              <input
                type="number"
                placeholder="Min"
                value={formData.minAmount}
                onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                className="w-full p-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Max Order (USD)</label>
              <input
                type="number"
                placeholder="Max"
                value={formData.maxAmount}
                onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                className="w-full p-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="text-sm font-medium mb-2 block">Accepted Payment Methods</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => togglePaymentMethod(method.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    formData.paymentMethods.includes(method.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {method.name}
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Note:</strong> Creating a trade requires depositing tokens into escrow.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>2.5% platform fee on completed trades</li>
              <li>Tokens locked until trade completes or expires</li>
              <li>7 day default expiration</li>
            </ul>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading || formData.paymentMethods.length === 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Trade Listing'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

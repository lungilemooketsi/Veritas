'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CheckCircle, AlertCircle, Wallet } from 'lucide-react';

interface OnrampSession {
  sessionId: string;
  clientSecret: string;
  publishableKey: string;
}

const NETWORKS = [
  { id: 'polygon', name: 'Polygon', chainId: 137, icon: '🟣' },
  { id: 'arbitrum', name: 'Arbitrum', chainId: 42161, icon: '🔵' },
];

const AMOUNTS = [50, 100, 250, 500, 1000];

export function OnrampWidget() {
  const { address, isConnected } = useAccount();
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<OnrampSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const effectiveAmount = customAmount ? parseFloat(customAmount) : amount;

  const createOnrampSession = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (effectiveAmount < 10 || effectiveAmount > 10000) {
      setError('Amount must be between $10 and $10,000');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('loading');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/onramp/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          amount: effectiveAmount,
          currency: 'usd',
          destinationNetwork: selectedNetwork.id,
          destinationCurrency: 'usdc',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSession(data);
      setStatus('ready');
      
      // In production, you would initialize the Stripe Onramp SDK here
      // loadStripeOnramp(data.publishableKey).then(onramp => {
      //   onramp.createSession({ clientSecret: data.clientSecret });
      // });

    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-card rounded-xl border p-8 text-center">
        <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground mb-4">
          Connect your wallet to purchase crypto directly to your address.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Buy USDC</h2>
            <p className="text-sm text-muted-foreground">
              Powered by Stripe • KYC Required
            </p>
          </div>
          <CreditCard className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Network Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Destination Network</label>
          <div className="grid grid-cols-2 gap-3">
            {NETWORKS.map((network) => (
              <button
                key={network.id}
                onClick={() => setSelectedNetwork(network)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedNetwork.id === network.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{network.icon}</span>
                  <span className="font-medium">{network.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Amount (USD)</label>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAmount(a);
                  setCustomAmount('');
                }}
                className={`py-2 px-3 rounded-lg border transition-colors text-sm font-medium ${
                  amount === a && !customAmount
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                ${a}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min={10}
              max={10000}
              className="w-full pl-8 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Min: $10 • Max: $10,000 per transaction
          </p>
        </div>

        {/* Receiving Address */}
        <div>
          <label className="text-sm font-medium mb-2 block">Receiving Wallet</label>
          <div className="p-3 rounded-lg bg-secondary/50 border font-mono text-sm break-all">
            {address}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-secondary/30 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">You pay</span>
            <span className="font-medium">${effectiveAmount.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Network fee</span>
            <span className="font-medium text-green-600">~$0.01</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Processing fee</span>
            <span className="font-medium">~${(effectiveAmount * 0.015).toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between">
            <span className="font-medium">You receive</span>
            <span className="font-bold text-lg">
              ~{(effectiveAmount * 0.98).toFixed(2)} USDC
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success Display */}
        {status === 'ready' && session && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            Session created! Stripe onramp will open shortly...
          </div>
        )}

        {/* CTA Button */}
        <Button
          onClick={createOnrampSession}
          disabled={isLoading || effectiveAmount < 10}
          className="w-full h-12 text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Session...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              Buy ${effectiveAmount.toFixed(0)} USDC
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>
            🔒 Secure payment processing by Stripe
          </p>
          <p>
            Identity verification required on first purchase
          </p>
        </div>
      </div>
    </div>
  );
}

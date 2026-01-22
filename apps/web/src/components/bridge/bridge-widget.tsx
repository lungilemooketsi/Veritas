'use client';

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ArrowDown, Loader2, Wallet, ArrowLeftRight, ExternalLink } from 'lucide-react';

const CHAINS = [
  { id: 137, name: 'Polygon', icon: '🟣', selector: '4051577828743386545', rpc: 'https://polygon-rpc.com' },
  { id: 42161, name: 'Arbitrum', icon: '🔵', selector: '4949039107694359620', rpc: 'https://arb1.arbitrum.io/rpc' },
];

const TOKENS = [
  { 
    symbol: 'USDC', 
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    }
  },
];

export function BridgeWidget() {
  const { address, isConnected } = useAccount();
  const [sourceChain, setSourceChain] = useState(CHAINS[0]);
  const [destChain, setDestChain] = useState(CHAINS[1]);
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const swapChains = () => {
    setSourceChain(destChain);
    setDestChain(sourceChain);
  };

  const handleBridge = async () => {
    if (!address || !amount) return;

    setIsLoading(true);
    try {
      // In production, this would:
      // 1. Approve token spending
      // 2. Call bridgeTokens on VeritasCrossChainBridge contract
      console.log('Bridging:', {
        from: sourceChain.name,
        to: destChain.name,
        amount,
        token: selectedToken.symbol,
      });
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTxHash('0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2));
      
    } catch (error) {
      console.error('Bridge failed:', error);
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
          Connect your wallet to bridge assets across chains.
        </p>
      </div>
    );
  }

  if (txHash) {
    return (
      <div className="bg-card rounded-xl border p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <ArrowLeftRight className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Bridge Initiated!</h2>
        <p className="text-muted-foreground mb-4">
          Your assets are being bridged from {sourceChain.name} to {destChain.name}.
        </p>
        <div className="bg-secondary/50 rounded-lg p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
          <p className="font-mono text-sm break-all">{txHash}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Estimated time: 15-20 minutes
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => setTxHash(null)}>
            Bridge More
          </Button>
          <Button>
            <ExternalLink className="h-4 w-4 mr-2" />
            Track on CCIP Explorer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Bridge Assets</h2>
            <p className="text-sm text-muted-foreground">
              Powered by Chainlink CCIP
            </p>
          </div>
          <ArrowLeftRight className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Source Chain */}
        <div className="bg-secondary/30 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted-foreground">From</span>
            <span className="text-xs text-muted-foreground">Balance: 0.00</span>
          </div>
          
          <div className="flex gap-3">
            <select
              value={sourceChain.id}
              onChange={(e) => setSourceChain(CHAINS.find(c => c.id === Number(e.target.value))!)}
              className="bg-secondary rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
            
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-semibold focus:outline-none text-right"
            />
          </div>
          
          <div className="flex justify-end mt-2">
            <select
              value={selectedToken.symbol}
              onChange={(e) => setSelectedToken(TOKENS.find(t => t.symbol === e.target.value)!)}
              className="bg-secondary rounded-lg px-3 py-1 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-2">
          <button
            onClick={swapChains}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
        </div>

        {/* Destination Chain */}
        <div className="bg-secondary/30 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted-foreground">To</span>
          </div>
          
          <div className="flex gap-3">
            <select
              value={destChain.id}
              onChange={(e) => setDestChain(CHAINS.find(c => c.id === Number(e.target.value))!)}
              className="bg-secondary rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CHAINS.filter(c => c.id !== sourceChain.id).map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
            
            <div className="flex-1 text-2xl font-semibold text-right text-muted-foreground">
              {amount ? (parseFloat(amount) * 0.998).toFixed(4) : '0.0'}
            </div>
          </div>
          
          <div className="flex justify-end mt-2">
            <span className="px-3 py-1 text-sm text-muted-foreground">
              {selectedToken.symbol}
            </span>
          </div>
        </div>

        {/* Fee Info */}
        <div className="bg-secondary/20 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bridge Fee</span>
            <span>0.2%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Gas</span>
            <span>~$0.50</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Time</span>
            <span>15-20 min</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>You will receive</span>
            <span>{amount ? (parseFloat(amount) * 0.998).toFixed(4) : '0.00'} {selectedToken.symbol}</span>
          </div>
        </div>

        {/* Bridge Button */}
        <Button
          onClick={handleBridge}
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
          className="w-full h-12 text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Bridging...
            </>
          ) : (
            <>
              <ArrowLeftRight className="mr-2 h-5 w-5" />
              Bridge {selectedToken.symbol}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

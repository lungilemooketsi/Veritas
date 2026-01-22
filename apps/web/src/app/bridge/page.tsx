import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BridgeWidget } from '@/components/bridge/bridge-widget';

export const metadata = {
  title: 'Bridge | Veritas',
  description: 'Bridge assets across chains with Chainlink CCIP',
};

export default function BridgePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Cross-Chain Bridge</h1>
              <p className="text-muted-foreground">
                Bridge your assets between Polygon and Arbitrum securely
              </p>
            </div>
            
            <BridgeWidget />

            {/* Info Section */}
            <div className="mt-8 bg-card rounded-xl border p-6">
              <h2 className="font-semibold mb-4">How it works</h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <p>Select your source and destination chains, then enter the amount to bridge.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <p>Approve the token spending and initiate the bridge transaction.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <p>Chainlink CCIP securely transfers your assets to the destination chain.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <p>Receive your tokens on the destination chain within ~15-20 minutes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

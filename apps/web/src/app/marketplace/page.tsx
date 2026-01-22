import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MarketplaceContent } from '@/components/marketplace/marketplace-content';

export const metadata = {
  title: 'Marketplace | Veritas',
  description: 'Browse and create P2P crypto trades on Veritas',
};

export default function MarketplacePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">P2P Marketplace</h1>
            <p className="text-muted-foreground">
              Trade crypto securely with escrow protection and reputation-backed sellers
            </p>
          </div>
          
          <MarketplaceContent />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

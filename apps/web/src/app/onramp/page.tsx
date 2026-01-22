import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { OnrampWidget } from '@/components/onramp/onramp-widget';

export default function OnrampPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Header />
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Buy Crypto with Card</h1>
            <p className="text-muted-foreground">
              Purchase USDC instantly using your credit card or bank account.
              Powered by Stripe&apos;s secure payment infrastructure.
            </p>
          </div>
          <OnrampWidget />
        </div>
      </div>
      <Footer />
    </main>
  );
}

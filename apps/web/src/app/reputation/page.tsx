import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ReputationDashboard } from '@/components/reputation/reputation-dashboard';

export const metadata = {
  title: 'Reputation | Veritas',
  description: 'Track your reputation and soulbound badges on Veritas',
};

export default function ReputationPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Reputation System</h1>
            <p className="text-muted-foreground">
              Build your on-chain reputation with soulbound badges
            </p>
          </div>
          
          <ReputationDashboard />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

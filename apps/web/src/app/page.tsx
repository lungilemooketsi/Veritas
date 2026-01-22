import { Header } from '@/components/layout/header';
import { HeroSection } from '@/components/home/hero-section';
import { FeaturesSection } from '@/components/home/features-section';
import { HowItWorksSection } from '@/components/home/how-it-works';
import { BadgeTiersSection } from '@/components/home/badge-tiers';
import { Footer } from '@/components/layout/footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BadgeTiersSection />
      <Footer />
    </main>
  );
}

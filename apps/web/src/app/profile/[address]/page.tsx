import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProfileContent } from '@/components/profile/profile-content';

interface ProfilePageProps {
  params: { address: string };
}

export async function generateMetadata({ params }: ProfilePageProps) {
  return {
    title: `${params.address} | Veritas`,
    description: `View trader profile and reputation for ${params.address}`,
  };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <ProfileContent address={params.address} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

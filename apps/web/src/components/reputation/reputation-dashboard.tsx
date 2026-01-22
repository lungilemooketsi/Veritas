'use client';

import { useAccount } from 'wagmi';
import { BadgeIcon } from './badge-icon';
import { ReputationStats } from './reputation-stats';
import { BadgeProgress } from './badge-progress';
import { RecentActivity } from './recent-activity';
import { Leaderboard } from './leaderboard';
import { Wallet } from 'lucide-react';

export function ReputationDashboard() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="bg-card rounded-xl border p-8 text-center max-w-md mx-auto">
        <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground mb-4">
          Connect your wallet to view your reputation and badges.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Stats Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Current Badge & Stats */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <BadgeIcon tier="Gold" size="lg" showLabel />
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">Gold Trader</h2>
              <p className="text-muted-foreground mb-4">
                You're on your way to Platinum! Keep trading to level up.
              </p>
              <ReputationStats />
            </div>
          </div>
        </div>

        {/* Badge Progress */}
        <BadgeProgress />

        {/* Recent Activity */}
        <RecentActivity />
      </div>

      {/* Leaderboard Column */}
      <div>
        <Leaderboard />
      </div>
    </div>
  );
}

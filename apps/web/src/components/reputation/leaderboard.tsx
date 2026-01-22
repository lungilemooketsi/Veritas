'use client';

import { BadgeIcon } from './badge-icon';
import { Trophy, TrendingUp, Medal } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  address: string;
  badge: string;
  trades: number;
  rating: number;
  isCurrentUser?: boolean;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: '0x1234...5678', badge: 'Diamond', trades: 489, rating: 4.98 },
  { rank: 2, address: '0xabcd...efgh', badge: 'Diamond', trades: 412, rating: 4.97 },
  { rank: 3, address: '0x9876...5432', badge: 'Diamond', trades: 378, rating: 4.96 },
  { rank: 4, address: '0xfedc...ba98', badge: 'Platinum', trades: 234, rating: 4.95 },
  { rank: 5, address: '0x1111...2222', badge: 'Platinum', trades: 198, rating: 4.94 },
  { rank: 6, address: '0x3333...4444', badge: 'Platinum', trades: 167, rating: 4.92 },
  { rank: 7, address: '0x5555...6666', badge: 'Gold', trades: 134, rating: 4.91 },
  { rank: 8, address: '0x7777...8888', badge: 'Gold', trades: 112, rating: 4.89 },
  { rank: 42, address: '0xYOUR...ADDR', badge: 'Gold', trades: 67, rating: 4.85, isCurrentUser: true },
];

const RANK_ICONS: Record<number, React.ReactNode> = {
  1: <Trophy className="h-4 w-4 text-yellow-500" />,
  2: <Medal className="h-4 w-4 text-gray-400" />,
  3: <Medal className="h-4 w-4 text-amber-700" />,
};

export function Leaderboard() {
  const topTraders = MOCK_LEADERBOARD.filter(e => e.rank <= 8);
  const currentUser = MOCK_LEADERBOARD.find(e => e.isCurrentUser);

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="bg-primary/5 p-4 border-b">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Top Traders</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on total trades and rating
        </p>
      </div>

      <div className="divide-y">
        {topTraders.map((entry) => (
          <div 
            key={entry.rank}
            className={`flex items-center gap-3 p-3 ${
              entry.isCurrentUser ? 'bg-primary/5' : 'hover:bg-secondary/30'
            }`}
          >
            <div className="w-6 flex justify-center">
              {RANK_ICONS[entry.rank] || (
                <span className="text-sm text-muted-foreground">{entry.rank}</span>
              )}
            </div>
            <BadgeIcon tier={entry.badge} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.address}</p>
              <p className="text-xs text-muted-foreground">
                {entry.trades} trades • {entry.rating.toFixed(2)} ⭐
              </p>
            </div>
          </div>
        ))}

        {/* Current User Position (if not in top 8) */}
        {currentUser && currentUser.rank > 8 && (
          <>
            <div className="py-2 text-center text-xs text-muted-foreground">
              • • •
            </div>
            <div className="flex items-center gap-3 p-3 bg-primary/5">
              <div className="w-6 flex justify-center">
                <span className="text-sm font-medium">{currentUser.rank}</span>
              </div>
              <BadgeIcon tier={currentUser.badge} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">You</p>
                <p className="text-xs text-muted-foreground">
                  {currentUser.trades} trades • {currentUser.rating.toFixed(2)} ⭐
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t">
        <button className="w-full text-sm text-primary hover:text-primary/80 transition-colors">
          View Full Leaderboard
        </button>
      </div>
    </div>
  );
}

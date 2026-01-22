'use client';

import { BadgeIcon } from './badge-icon';

const BADGE_TIERS = [
  { tier: 'Bronze', trades: 10, rating: 4.0, unlocked: true },
  { tier: 'Silver', trades: 25, rating: 4.5, unlocked: true },
  { tier: 'Gold', trades: 50, rating: 4.8, unlocked: true, current: true },
  { tier: 'Platinum', trades: 100, rating: 4.9, unlocked: false },
  { tier: 'Diamond', trades: 250, rating: 4.95, unlocked: false },
];

const CURRENT_STATS = {
  trades: 67,
  rating: 4.85,
};

export function BadgeProgress() {
  // Find next tier
  const nextTier = BADGE_TIERS.find(t => !t.unlocked);
  
  if (!nextTier) {
    return (
      <div className="bg-card rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Maximum Rank Achieved!</h3>
        <p className="text-muted-foreground">
          Congratulations! You've reached Diamond tier - the highest rank on Veritas.
        </p>
      </div>
    );
  }

  const tradesProgress = Math.min((CURRENT_STATS.trades / nextTier.trades) * 100, 100);
  const ratingProgress = Math.min((CURRENT_STATS.rating / nextTier.rating) * 100, 100);

  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Progress to {nextTier.tier}</h3>
        <BadgeIcon tier={nextTier.tier} size="sm" />
      </div>

      <div className="space-y-6">
        {/* Trades Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Completed Trades</span>
            <span className="font-medium">
              {CURRENT_STATS.trades} / {nextTier.trades}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${tradesProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {nextTier.trades - CURRENT_STATS.trades} more trades needed
          </p>
        </div>

        {/* Rating Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Average Rating</span>
            <span className="font-medium">
              {CURRENT_STATS.rating.toFixed(2)} / {nextTier.rating.toFixed(2)}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full transition-all"
              style={{ width: `${ratingProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {CURRENT_STATS.rating >= nextTier.rating 
              ? '✓ Rating requirement met!'
              : `Maintain ${nextTier.rating.toFixed(2)}+ rating`
            }
          </p>
        </div>
      </div>

      {/* All Tiers */}
      <div className="mt-8">
        <h4 className="text-sm font-medium mb-4">All Badge Tiers</h4>
        <div className="flex justify-between">
          {BADGE_TIERS.map((badge) => (
            <div 
              key={badge.tier}
              className={`flex flex-col items-center ${!badge.unlocked ? 'opacity-40' : ''}`}
            >
              <BadgeIcon tier={badge.tier} size="sm" />
              <span className="text-xs mt-1">{badge.tier}</span>
              {badge.current && (
                <span className="text-xs text-primary">Current</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

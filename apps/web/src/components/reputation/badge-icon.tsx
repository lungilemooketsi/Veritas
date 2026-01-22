'use client';

import { Award, Shield, Star, Trophy, Crown, Gem } from 'lucide-react';

interface BadgeIconProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  None: {
    icon: <Award className="h-full w-full" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    label: 'Unranked',
  },
  Bronze: {
    icon: <Shield className="h-full w-full" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-700/10',
    label: 'Bronze',
  },
  Silver: {
    icon: <Star className="h-full w-full" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    label: 'Silver',
  },
  Gold: {
    icon: <Trophy className="h-full w-full" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Gold',
  },
  Platinum: {
    icon: <Crown className="h-full w-full" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    label: 'Platinum',
  },
  Diamond: {
    icon: <Gem className="h-full w-full" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'Diamond',
  },
};

const SIZES = {
  sm: 'h-8 w-8 p-1.5',
  md: 'h-12 w-12 p-2',
  lg: 'h-16 w-16 p-3',
};

export function BadgeIcon({ tier, size = 'md', showLabel = false }: BadgeIconProps) {
  const config = BADGE_CONFIG[tier] || BADGE_CONFIG.None;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${SIZES[size]} ${config.color} ${config.bgColor} rounded-full flex items-center justify-center`}
        title={config.label}
      >
        {config.icon}
      </div>
      {showLabel && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

'use client';

import { TrendingUp, Star, Shield, Clock } from 'lucide-react';

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
}

const MOCK_STATS: Stat[] = [
  {
    label: 'Total Trades',
    value: '67',
    icon: <TrendingUp className="h-4 w-4" />,
    change: '+12 this month',
  },
  {
    label: 'Average Rating',
    value: '4.85',
    icon: <Star className="h-4 w-4" />,
    change: '+0.05 from last month',
  },
  {
    label: 'Trust Score',
    value: '92%',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    label: 'Member Since',
    value: 'Mar 2024',
    icon: <Clock className="h-4 w-4" />,
  },
];

export function ReputationStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {MOCK_STATS.map((stat) => (
        <div key={stat.label} className="bg-secondary/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            {stat.icon}
            <span className="text-xs">{stat.label}</span>
          </div>
          <div className="font-semibold text-lg">{stat.value}</div>
          {stat.change && (
            <div className="text-xs text-green-600">{stat.change}</div>
          )}
        </div>
      ))}
    </div>
  );
}

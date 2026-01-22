'use client';

import { CheckCircle, XCircle, Clock, Star } from 'lucide-react';

interface Activity {
  id: string;
  type: 'trade_complete' | 'trade_cancelled' | 'rating_received' | 'badge_earned';
  description: string;
  timestamp: string;
  details?: string;
}

const MOCK_ACTIVITY: Activity[] = [
  {
    id: '1',
    type: 'trade_complete',
    description: 'Trade completed with 0xabc...123',
    timestamp: '2 hours ago',
    details: '500 USDC',
  },
  {
    id: '2',
    type: 'rating_received',
    description: 'Received 5-star rating',
    timestamp: '2 hours ago',
    details: '"Fast and professional!"',
  },
  {
    id: '3',
    type: 'badge_earned',
    description: 'Earned Gold Badge!',
    timestamp: '1 day ago',
  },
  {
    id: '4',
    type: 'trade_complete',
    description: 'Trade completed with 0xdef...456',
    timestamp: '2 days ago',
    details: '1,200 USDC',
  },
  {
    id: '5',
    type: 'trade_cancelled',
    description: 'Trade cancelled (expired)',
    timestamp: '3 days ago',
    details: 'No penalty applied',
  },
];

const ACTIVITY_ICONS: Record<Activity['type'], React.ReactNode> = {
  trade_complete: <CheckCircle className="h-4 w-4 text-green-500" />,
  trade_cancelled: <XCircle className="h-4 w-4 text-red-500" />,
  rating_received: <Star className="h-4 w-4 text-yellow-500" />,
  badge_earned: <span className="text-sm">🏆</span>,
};

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl border p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {MOCK_ACTIVITY.map((activity) => (
          <div 
            key={activity.id}
            className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0"
          >
            <div className="mt-0.5">
              {ACTIVITY_ICONS[activity.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{activity.description}</p>
              {activity.details && (
                <p className="text-sm text-muted-foreground">{activity.details}</p>
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
              <Clock className="h-3 w-3 mr-1" />
              {activity.timestamp}
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 text-sm text-primary hover:text-primary/80 transition-colors">
        View All Activity
      </button>
    </div>
  );
}

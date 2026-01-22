'use client';

import { useState, useEffect } from 'react';
import { BadgeIcon } from '@/components/reputation/badge-icon';
import { Copy, ExternalLink, Star, TrendingUp, Shield, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileContentProps {
  address: string;
}

interface Profile {
  address: string;
  badge: string;
  trades: number;
  rating: number;
  trustScore: number;
  memberSince: string;
  successRate: number;
  activeListings: number;
  volumeTraded: string;
}

// Mock profile data
const MOCK_PROFILE: Profile = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  badge: 'Gold',
  trades: 67,
  rating: 4.85,
  trustScore: 92,
  memberSince: 'March 2024',
  successRate: 98.5,
  activeListings: 3,
  volumeTraded: '$45,678',
};

export function ProfileContent({ address }: ProfileContentProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchProfile = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProfile({ ...MOCK_PROFILE, address });
      setIsLoading(false);
    };
    fetchProfile();
  }, [address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string) => {
    if (addr.length < 20) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 bg-secondary rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <BadgeIcon tier={profile.badge} size="lg" />
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{profile.badge} Trader</h1>
              <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-medium rounded-full">
                Verified
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <code className="font-mono">{formatAddress(profile.address)}</code>
              <button
                onClick={copyAddress}
                className="p-1 hover:bg-secondary rounded transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <a
                href={`https://polygonscan.com/address/${profile.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-secondary rounded transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline">Message</Button>
            <Button>Trade with User</Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Total Trades</span>
          </div>
          <p className="text-2xl font-bold">{profile.trades}</p>
        </div>

        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Star className="h-4 w-4" />
            <span className="text-sm">Rating</span>
          </div>
          <p className="text-2xl font-bold">{profile.rating.toFixed(2)} ⭐</p>
        </div>

        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Success Rate</span>
          </div>
          <p className="text-2xl font-bold">{profile.successRate}%</p>
        </div>

        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Member Since</span>
          </div>
          <p className="text-2xl font-bold">{profile.memberSince}</p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Volume & Listings */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Trading Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Volume</span>
              <span className="font-semibold">{profile.volumeTraded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Listings</span>
              <span className="font-semibold">{profile.activeListings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trust Score</span>
              <span className="font-semibold">{profile.trustScore}%</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Earned Badges</h3>
          <div className="flex gap-4">
            {['Bronze', 'Silver', 'Gold'].map((tier) => (
              <div key={tier} className="text-center">
                <BadgeIcon tier={tier} size="md" />
                <p className="text-xs text-muted-foreground mt-1">{tier}</p>
              </div>
            ))}
            <div className="text-center opacity-30">
              <BadgeIcon tier="Platinum" size="md" />
              <p className="text-xs text-muted-foreground mt-1">Platinum</p>
            </div>
            <div className="text-center opacity-30">
              <BadgeIcon tier="Diamond" size="md" />
              <p className="text-xs text-muted-foreground mt-1">Diamond</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

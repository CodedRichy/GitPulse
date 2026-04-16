/**
 * Tier definitions and feature gates for GitPulse.
 */

export type Tier = 'free' | 'pro' | 'team';

export interface TierFeatures {
  maxCommits: number;
  maxCustomGates: number;
  analytics: boolean;
  contributors: number;
  configEditing: boolean;
  teamSync: boolean;
}

// Unlimited is represented by -1
export const UNLIMITED = -1;

export const TIER_FEATURES: Record<Tier, TierFeatures> = {
  free: {
    maxCommits: 100,
    maxCustomGates: 0,
    analytics: false,
    contributors: 1,
    configEditing: false,
    teamSync: false,
  },
  pro: {
    maxCommits: UNLIMITED,
    maxCustomGates: 5,
    analytics: true,
    contributors: 1,
    configEditing: true,
    teamSync: false,
  },
  team: {
    maxCommits: UNLIMITED,
    maxCustomGates: UNLIMITED,
    analytics: true,
    contributors: UNLIMITED,
    configEditing: true,
    teamSync: true,
  },
};

export function getTierFeatures(tier: Tier): TierFeatures {
  return TIER_FEATURES[tier];
}

export function canUseFeature(tier: Tier, feature: keyof TierFeatures): boolean {
  return TIER_FEATURES[tier][feature] as boolean;
}

export function getMaxCustomGates(tier: Tier): number {
  return TIER_FEATURES[tier].maxCustomGates;
}

export function isFeatureLimited(tier: Tier, feature: 'maxCustomGates', current: number): boolean {
  const limit = TIER_FEATURES[tier][feature];
  if (limit === UNLIMITED) return false;
  return current >= limit;
}

export function getTierBadge(tier: Tier): { text: string; color: string } {
  switch (tier) {
    case 'free':
      return { text: 'Free', color: 'bg-gray-100 text-gray-700' };
    case 'pro':
      return { text: 'Pro', color: 'bg-blue-100 text-blue-700' };
    case 'team':
      return { text: 'Team', color: 'bg-purple-100 text-purple-700' };
  }
}

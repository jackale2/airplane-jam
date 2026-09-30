/** Lifetime counters kept in the save. */
export interface Stats {
  passengers: number;
  planes: number;
  wins: number;
  perfect: number; // 3-star wins
  hardWins: number;
  zenBoards: number;
  zenPassengers: number;
  bestChain: number;
  loginDays: number;
  lastLogin: string;
  boostersUsed: number;
}

export const emptyStats = (): Stats => ({
  passengers: 0,
  planes: 0,
  wins: 0,
  perfect: 0,
  hardWins: 0,
  zenBoards: 0,
  zenPassengers: 0,
  bestChain: 0,
  loginDays: 0,
  lastLogin: '',
  boostersUsed: 0,
});

/** Values an achievement can track: the lifetime stats plus two derived ones. */
export type AchievementStat = Exclude<keyof Stats, 'lastLogin' | 'zenPassengers' | 'boostersUsed'> | 'stars' | 'destinations';

export interface AchievementDef {
  id: string;
  name: string;
  icon: 'plane' | 'person' | 'trophy' | 'star' | 'crown' | 'globe' | 'leaf' | 'bolt' | 'calendar' | 'flame';
  stat: AchievementStat;
  tiers: number[];
  text: (n: number) => string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'wins', name: 'Frequent Flyer', icon: 'trophy', stat: 'wins', tiers: [5, 25, 50, 100, 200, 500], text: (n) => `Win ${n} levels` },
  { id: 'passengers', name: 'People Mover', icon: 'person', stat: 'passengers', tiers: [100, 1000, 5000, 20000, 50000, 100000], text: (n) => `Board ${n.toLocaleString('en-US')} passengers` },
  { id: 'planes', name: 'Tower Control', icon: 'plane', stat: 'planes', tiers: [20, 200, 1000, 3000, 6000, 12000], text: (n) => `Send off ${n.toLocaleString('en-US')} planes` },
  { id: 'stars', name: 'Star Collector', icon: 'star', stat: 'stars', tiers: [15, 60, 150, 300, 450, 600], text: (n) => `Collect ${n} stars` },
  { id: 'perfect', name: 'Perfectionist', icon: 'crown', stat: 'perfect', tiers: [5, 25, 75, 150, 250, 400], text: (n) => `Win ${n} levels with 3 stars` },
  { id: 'globe', name: 'Globetrotter', icon: 'globe', stat: 'destinations', tiers: [2, 3, 5, 7, 10, 15], text: (n) => `Reach ${n} destinations` },
  { id: 'zen', name: 'Zen Master', icon: 'leaf', stat: 'zenBoards', tiers: [3, 15, 50, 100, 200, 400], text: (n) => `Clear ${n} Zen boards` },
  { id: 'chain', name: 'Chain Reaction', icon: 'bolt', stat: 'bestChain', tiers: [8, 12, 16, 20, 26, 32], text: (n) => `Board ${n} passengers with one tap` },
  { id: 'daily', name: 'Daily Traveler', icon: 'calendar', stat: 'loginDays', tiers: [3, 7, 14, 30, 60, 100], text: (n) => `Play on ${n} different days` },
  { id: 'hard', name: 'Daredevil', icon: 'flame', stat: 'hardWins', tiers: [1, 5, 10, 25, 50, 100], text: (n) => `Win ${n} HARD levels` },
];

/** Coins for claiming tier 1, 2, 3, ... */
export const TIER_REWARDS = [50, 100, 200, 350, 500, 800];

export interface AchievementView {
  def: AchievementDef;
  value: number;
  claimed: number; // tiers already claimed
  target: number | null; // next tier target, null when all are claimed
  claimable: boolean;
  reward: number;
}

export function achievementView(def: AchievementDef, value: number, claimed: number): AchievementView {
  const c = Math.min(claimed, def.tiers.length);
  const target = c < def.tiers.length ? def.tiers[c]! : null;
  return { def, value, claimed: c, target, claimable: target !== null && value >= target, reward: TIER_REWARDS[Math.min(c, TIER_REWARDS.length - 1)]! };
}

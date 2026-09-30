import type { BoosterId } from '../data/tuning.ts';

/** A bundle the player can be given: coins and/or boosters. */
export interface Reward {
  coins?: number;
  boosters?: Partial<Record<BoosterId, number>>;
}

/** 7-day gift calendar. Missing a day never resets it: the next login simply opens the next box. */
export const DAILY_REWARDS: Reward[] = [
  { coins: 50 },
  { boosters: { extraGate: 1 } },
  { coins: 100 },
  { boosters: { sortQueue: 1 } },
  { coins: 150 },
  { boosters: { shuffleBoard: 1 } },
  { coins: 300, boosters: { extraGate: 1, sortQueue: 1, shuffleBoard: 1 } },
];

export interface DailyState {
  lastClaim: string; // YYYY-MM-DD of the last claim, '' if never
  day: number; // how many gifts have been claimed in total
}

export function dailyAvailable(s: DailyState, today: string) {
  return s.lastClaim !== today;
}

/** Index 0..6 of the gift that the next claim opens. */
export function dailySlot(s: DailyState) {
  return s.day % DAILY_REWARDS.length;
}

export function claimDaily(s: DailyState, today: string): { reward: Reward; next: DailyState } | null {
  if (!dailyAvailable(s, today)) return null;
  return { reward: DAILY_REWARDS[dailySlot(s)]!, next: { lastClaim: today, day: s.day + 1 } };
}

export function describeReward(r: Reward) {
  const parts: string[] = [];
  if (r.coins) parts.push(`${r.coins} coins`);
  const names: Record<BoosterId, string> = { extraGate: 'Gate', sortQueue: 'Sort', shuffleBoard: 'Shuffle' };
  for (const [id, n] of Object.entries(r.boosters ?? {})) if (n) parts.push(`${n} ${names[id as BoosterId]}`);
  return parts.join(' + ');
}

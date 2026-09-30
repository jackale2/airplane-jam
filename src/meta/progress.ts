import { TUNING } from '../data/tuning.ts';

export type Stars = 1 | 2 | 3;

/** Three stars for a clean win, two with one booster, one otherwise (or after a continue). */
export function starsFor(r: { boostersUsed: number; continues: number }): Stars {
  if (r.continues > 0) return 1;
  if (r.boostersUsed === 0) return 3;
  return r.boostersUsed === 1 ? 2 : 1;
}

/** Every 10th level from 20 on is a HARD level: tighter by design and pays double. */
export function isHardLevel(level: number) {
  return level >= 20 && level % 10 === 0;
}

export interface WinReward {
  base: number;
  starBonus: number;
  hardBonus: number;
  firstWin: number;
  total: number;
}

/** Coins for a win. `firstWinToday` adds the once-a-day bonus. */
export function winReward(level: number, stars: Stars, firstWinToday: boolean): WinReward {
  const base = TUNING.levelReward;
  const starBonus = (stars - 1) * TUNING.starBonus;
  const hardBonus = isHardLevel(level) ? base + starBonus : 0;
  const firstWin = firstWinToday ? TUNING.dailyReward : 0;
  return { base, starBonus, hardBonus, firstWin, total: base + starBonus + hardBonus + firstWin };
}

/** Total stars over all levels. */
export function totalStars(stars: Record<string, number>) {
  return Object.values(stars).reduce((a, b) => a + b, 0);
}

/** Boosters unlock as the campaign goes on, each with a free sample. */
export const BOOSTER_UNLOCK = { extraGate: 4, sortQueue: 7, shuffleBoard: 10 } as const;
export const ZEN_UNLOCK = 6;

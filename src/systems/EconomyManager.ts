import { BOOSTER_IDS, TUNING, type BoosterId } from '../data/tuning.ts';
import { dayKey } from '../meta/dates.ts';
import { winReward, type Stars, type WinReward } from '../meta/progress.ts';
import type { Reward } from '../meta/rewards.ts';
import type { SaveManager } from './SaveManager.ts';

/** Coins and booster counts, all persisted through SaveManager. */
export class EconomyManager {
  private readonly save: SaveManager;
  constructor(save: SaveManager) {
    this.save = save;
  }
  private get d() {
    return this.save.data;
  }

  get coins() {
    return this.d.coins;
  }
  addCoins(n: number) {
    this.d.coins += Math.max(0, Math.floor(n));
    this.save.save();
  }
  spend(n: number) {
    if (this.d.coins < n) return false;
    this.d.coins -= n;
    this.save.save();
    return true;
  }

  count(b: BoosterId) {
    return this.d.boosters[b];
  }
  add(b: BoosterId, n = 1) {
    this.d.boosters[b] += n;
    this.save.save();
  }
  /** Consume one owned booster. */
  use(b: BoosterId) {
    if (this.d.boosters[b] < 1) return false;
    this.d.boosters[b]--;
    this.save.save();
    return true;
  }
  /** Pay coins for a booster that is about to be used right away. */
  buy(b: BoosterId) {
    return this.spend(TUNING.boosterCost[b]);
  }

  grant(r: Reward) {
    if (r.coins) this.d.coins += r.coins;
    for (const id of BOOSTER_IDS) this.d.boosters[id] += r.boosters?.[id] ?? 0;
    this.save.save();
  }

  /** The first win of each day pays a bonus. */
  get firstWinAvailable() {
    return this.d.lastWinBonus !== dayKey();
  }

  /** Coins for winning a level, paid out right away. */
  claimWin(level: number, stars: Stars): WinReward {
    const first = this.firstWinAvailable;
    if (first) this.d.lastWinBonus = dayKey();
    const r = winReward(level, stars, first);
    this.addCoins(r.total);
    return r;
  }
}

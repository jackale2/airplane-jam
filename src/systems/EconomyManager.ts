import { TUNING, type BoosterId } from '../data/tuning.ts';
import type { SaveManager } from './SaveManager.ts';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Coins, booster counts and the daily reward, all persisted through SaveManager. */
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

  get dailyAvailable() {
    return this.d.lastDailyReward !== today();
  }

  /** Coins for winning a level: base reward plus the daily bonus on the first win of the day. */
  claimWinReward() {
    const daily = this.dailyAvailable;
    if (daily) this.d.lastDailyReward = today();
    const total = TUNING.levelReward + (daily ? TUNING.dailyReward : 0);
    this.addCoins(total);
    return { base: TUNING.levelReward, daily: daily ? TUNING.dailyReward : 0, total };
  }
}

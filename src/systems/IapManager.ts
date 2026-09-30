import { Capacitor } from '@capacitor/core';
import { TUNING } from '../data/tuning.ts';
import type { EconomyManager } from './EconomyManager.ts';
import type { SaveManager } from './SaveManager.ts';

/**
 * Milestone 6 plugs the purchase plugin in here. In the browser (dev only) purchases are
 * simulated so the Shop can be exercised; a production web build grants nothing.
 */
export class IapManager {
  private readonly save: SaveManager;
  private readonly economy: EconomyManager;
  constructor(save: SaveManager, economy: EconomyManager) {
    this.save = save;
    this.economy = economy;
  }

  /** Purchases are off in the launch build (TUNING.purchasesEnabled); the shop sells cosmetics for coins instead. */
  get enabled() {
    return TUNING.purchasesEnabled;
  }

  /** True if the purchase completed and was granted. */
  async buy(productId: string): Promise<boolean> {
    if (!this.enabled) return false;
    if (Capacitor.isNativePlatform()) return false; // ponytail: wire the IAP plugin at Milestone 6
    if (!import.meta.env.DEV) return false;
    return this.grant(productId);
  }

  /** Returns true if anything was restored. */
  async restore(): Promise<boolean> {
    return false; // ponytail: query the store's owned products at Milestone 6
  }

  private grant(productId: string) {
    if (productId === TUNING.removeAdsId) {
      this.save.data.adsRemoved = true;
      this.save.save();
      return true;
    }
    const pack = TUNING.coinPacks.find((p) => p.id === productId);
    if (!pack) return false;
    this.economy.addCoins(pack.coins);
    return true;
  }
}

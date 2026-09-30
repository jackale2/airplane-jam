import { Capacitor } from '@capacitor/core';
import { TUNING } from '../data/tuning.ts';
import type { SaveManager } from './SaveManager.ts';

/** Interstitial rules: from level 6, at most once every 3 levels, never within 90 s of the last ad. */
export function shouldShowInterstitial(a: { level: number; lastShownLevel: number; lastShownAt: number; now: number; adsRemoved: boolean }) {
  const r = TUNING.interstitial;
  return !a.adsRemoved && a.level >= r.fromLevel && a.level - a.lastShownLevel >= r.everyLevels && a.now - a.lastShownAt >= r.minGapMs;
}

/**
 * Milestone 6 plugs AdMob in here (test ad units first, UMP consent before the first request).
 * Until then, and always in the browser, this is a safe no-op: rewarded "succeeds" after a short
 * delay so every rewarded flow stays playable with `npm run dev`.
 */
export class AdsManager {
  private readonly save: SaveManager;
  private lastShownLevel = -99;
  private lastShownAt = -Infinity;
  private busy = false;

  constructor(save: SaveManager) {
    this.save = save;
  }

  get native() {
    return Capacitor.isNativePlatform();
  }

  /** Resolves true only if the reward should be granted. Guards against double grants while an ad is showing. */
  async showRewarded(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    try {
      // ponytail: browser/dev stub. Replace with the AdMob rewarded flow at Milestone 6.
      await new Promise((r) => setTimeout(r, 400));
      return true;
    } finally {
      this.busy = false;
    }
  }

  /** Called after a level is won. Returns true if an interstitial was shown. */
  async maybeShowInterstitial(level: number): Promise<boolean> {
    const now = Date.now();
    if (!shouldShowInterstitial({ level, lastShownLevel: this.lastShownLevel, lastShownAt: this.lastShownAt, now, adsRemoved: this.save.data.adsRemoved })) return false;
    this.lastShownLevel = level;
    this.lastShownAt = now;
    // ponytail: no ad network yet; add the AdMob interstitial call here at Milestone 6.
    return true;
  }
}

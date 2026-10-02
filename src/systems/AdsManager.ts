import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import { TUNING } from '../data/tuning.ts';
import type { SaveManager } from './SaveManager.ts';

/** Interstitial rules: from level 6, at most once every 3 levels, never within 90 s of the last ad. */
export function shouldShowInterstitial(a: { level: number; lastShownLevel: number; lastShownAt: number; now: number; adsRemoved: boolean }) {
  const r = TUNING.interstitial;
  return !a.adsRemoved && a.level >= r.fromLevel && a.level - a.lastShownLevel >= r.everyLevels && a.now - a.lastShownAt >= r.minGapMs;
}

// Google's sample units serve test ads. Real units are used only when the build sets VITE_ADS_LIVE=1,
// so debug/CI builds can never produce invalid traffic on the live account.
const LIVE = import.meta.env.VITE_ADS_LIVE === '1';
const UNITS = LIVE
  ? { interstitial: 'ca-app-pub-2488816533972233/2530934101', rewarded: 'ca-app-pub-2488816533972233/3756385864' }
  : { interstitial: 'ca-app-pub-3940256099942544/1033173712', rewarded: 'ca-app-pub-3940256099942544/5224354917' };

/** AdMob on device (UMP consent first); a safe stub in the browser so `npm run dev` stays playable. */
export class AdsManager {
  private readonly save: SaveManager;
  private lastShownLevel = -99;
  private lastShownAt = -Infinity;
  private busy = false;
  private readonly ready: Promise<boolean>;

  constructor(save: SaveManager) {
    this.save = save;
    this.ready = this.native && TUNING.adsEnabled ? this.init() : Promise.resolve(false);
  }

  get native() {
    return Capacitor.isNativePlatform();
  }

  /** Ads can be switched off in TUNING.adsEnabled; the UI hides every ad button then. */
  get enabled() {
    return TUNING.adsEnabled;
  }

  private async init(): Promise<boolean> {
    try {
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) info = await AdMob.showConsentForm();
      await AdMob.initialize();
      return info.canRequestAds;
    } catch {
      return false;
    }
  }

  /** Loads then shows one full-screen ad; resolves true only if `granted` flipped (rewarded) or the ad was shown (interstitial). */
  private async show(kind: 'rewarded' | 'interstitial'): Promise<boolean> {
    if (!(await this.ready)) return false;
    const E = kind === 'rewarded' ? RewardAdPluginEvents : InterstitialAdPluginEvents;
    let granted = false;
    let shown = false;
    const handles: PluginListenerHandle[] = [];
    try {
      const done = new Promise<void>((resolve) => {
        void (async () => {
          handles.push(await AdMob.addListener(E.Dismissed as never, () => resolve()));
          handles.push(await AdMob.addListener(E.FailedToShow as never, () => resolve()));
          handles.push(await AdMob.addListener(E.Showed as never, () => (shown = true)));
          if (kind === 'rewarded') handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (granted = true)));
          try {
            if (kind === 'rewarded') {
              await AdMob.prepareRewardVideoAd({ adId: UNITS.rewarded });
              await AdMob.showRewardVideoAd();
            } else {
              await AdMob.prepareInterstitial({ adId: UNITS.interstitial });
              await AdMob.showInterstitial();
            }
          } catch {
            resolve();
          }
        })();
      });
      await done;
    } finally {
      await Promise.all(handles.map((h) => h.remove()));
    }
    return kind === 'rewarded' ? granted : shown;
  }

  /** Resolves true only if the reward should be granted. Guards against double grants while an ad is showing. */
  async showRewarded(): Promise<boolean> {
    if (!this.enabled || this.busy) return false;
    this.busy = true;
    try {
      if (!this.native) {
        await new Promise((r) => setTimeout(r, 400)); // browser/dev stub
        return true;
      }
      return await this.show('rewarded');
    } finally {
      this.busy = false;
    }
  }

  /** Called after a level is won. Returns true if an interstitial was shown. */
  async maybeShowInterstitial(level: number): Promise<boolean> {
    if (!this.enabled) return false;
    const now = Date.now();
    if (this.busy || !shouldShowInterstitial({ level, lastShownLevel: this.lastShownLevel, lastShownAt: this.lastShownAt, now, adsRemoved: this.save.data.adsRemoved })) return false;
    this.busy = true;
    try {
      const shown = this.native ? await this.show('interstitial') : true; // browser: pretend, so the pacing rules stay testable
      if (shown) {
        this.lastShownLevel = level;
        this.lastShownAt = Date.now();
      }
      return shown;
    } finally {
      this.busy = false;
    }
  }
}

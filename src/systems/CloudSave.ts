import { Capacitor, registerPlugin } from '@capacitor/core';
import { totalStars } from '../meta/progress.ts';
import { parseSave, type SaveData, type SaveManager } from './SaveManager.ts';

export interface CloudState {
  available: boolean; // Play Games is set up in this build (Android with a project id)
  signedIn: boolean;
  player?: string;
}

/** The native side is android/app/src/main/java/com/jackale2/airplanejam/PlayGamesPlugin.java. */
interface PlayGamesPlugin {
  status(): Promise<CloudState>;
  signIn(): Promise<CloudState>;
  load(o: { name: string }): Promise<{ data?: string | null }>;
  save(o: { name: string; data: string; description: string }): Promise<void>;
}

const SLOT = 'progress';
const PUSH_EVERY_MS = 60_000;

/** How far along a save is, compared in order: campaign level, stars, wins, passengers boarded. */
export function progressOf(d: SaveData): number[] {
  return [d.level, totalStars(d.stars), d.stats.wins, d.stats.passengers];
}

/** True when `a` is strictly further along than `b`. */
export function isAhead(a: SaveData, b: SaveData): boolean {
  const pa = progressOf(a);
  const pb = progressOf(b);
  for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pa[i]! > pb[i]!;
  return false;
}

/**
 * Decide what a sync does. The cloud copy wins only when it is further along (a new phone, a
 * reinstall); this device's settings always stay. Otherwise this device's save is uploaded if newer.
 */
export function merge(local: SaveData, cloud: SaveData | null): { use: SaveData | null; upload: boolean } {
  if (cloud && isAhead(cloud, local)) return { use: { ...cloud, settings: local.settings }, upload: false };
  return { use: null, upload: !cloud || isAhead(local, cloud) };
}

/**
 * Progress backup in Google Play Games Saved Games. The device save stays the source of truth while
 * playing; the cloud copy is read at launch (and after signing in) and written at most once a
 * minute, plus whenever the app goes to the background. Everywhere else (web, iOS, no project id)
 * this does nothing.
 */
export class CloudSave {
  state: CloudState = { available: false, signedIn: false };
  /** Called when a newer cloud save replaced this device's progress. */
  onRestored?: () => void;
  private readonly plugin?: PlayGamesPlugin;
  private dirty = false;
  private lastPush = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pushing = false;
  private readonly save: SaveManager;

  constructor(save: SaveManager) {
    this.save = save;
    if (Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('PlayGames')) {
      this.plugin = registerPlugin<PlayGamesPlugin>('PlayGames');
    }
  }

  /** Play Games is set up in this build, so Settings shows its row. */
  get supported() {
    return Boolean(this.plugin) && this.state.available;
  }

  /** At launch: Play Games signs in by itself; if it did, pull a newer cloud save. */
  async start() {
    if (!this.plugin) return false;
    try {
      this.state = await this.plugin.status();
    } catch {
      return false;
    }
    return this.state.signedIn ? this.sync() : false;
  }

  /** Settings > Sign in. Resolves with the new state. */
  async signIn() {
    if (!this.plugin) return this.state;
    try {
      this.state = await this.plugin.signIn();
      if (this.state.signedIn) await this.sync();
    } catch {
      // cancelled or no network: stay signed out
    }
    return this.state;
  }

  /** Returns true when the cloud copy replaced this device's progress. */
  async sync() {
    if (!this.plugin || !this.state.signedIn) return false;
    let cloud: SaveData | null = null;
    try {
      const res = await this.plugin.load({ name: SLOT });
      cloud = res.data ? parseSave(res.data) : null;
    } catch {
      return false;
    }
    const { use, upload } = merge(this.save.data, cloud);
    if (use) {
      this.save.data = use;
      this.save.flush();
      this.dirty = false;
      this.onRestored?.();
      return true;
    }
    if (upload) await this.push(true);
    return false;
  }

  /** The device save changed: upload it soon (at most once a minute). */
  markDirty() {
    if (!this.plugin || !this.state.signedIn) return;
    this.dirty = true;
    if (this.timer) return;
    const delay = Math.max(2000, this.lastPush + PUSH_EVERY_MS - Date.now());
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.push();
    }, delay);
  }

  /** Upload now if there is anything new (or always, when forced). Never throws. */
  async push(force = false) {
    if (!this.plugin || !this.state.signedIn || this.pushing || (!force && !this.dirty)) return;
    this.pushing = true;
    this.dirty = false;
    this.lastPush = Date.now();
    const d = this.save.data;
    try {
      await this.plugin.save({ name: SLOT, data: JSON.stringify(d), description: `Airplane Jam: level ${d.level}, ${totalStars(d.stars)} stars` });
    } catch {
      this.dirty = true; // try again with the next change or when the app goes to the background
    } finally {
      this.pushing = false;
    }
  }
}

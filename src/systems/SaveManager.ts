import { Preferences } from '@capacitor/preferences';
import { TUNING } from '../data/tuning.ts';

export interface SaveData {
  version: 1;
  level: number;
  coins: number;
  boosters: { extraGate: number; sortQueue: number; shuffleBoard: number };
  settings: { sound: boolean; music: boolean; vibration: boolean; symbols: boolean };
  tipsSeen: { extraGate: boolean; sortQueue: boolean; shuffleBoard: boolean };
  adsRemoved: boolean;
  lastDailyReward: string; // local date, YYYY-MM-DD
  tutorialSeen: boolean;
}

const KEY = 'airplane-jam-save';

export const defaultSave = (): SaveData => ({
  version: 1,
  level: 1,
  coins: 0,
  boosters: { ...TUNING.startBoosters },
  settings: { sound: true, music: true, vibration: true, symbols: true },
  tipsSeen: { extraGate: false, sortQueue: false, shuffleBoard: false },
  adsRemoved: false,
  lastDailyReward: '',
  tutorialSeen: false,
});

const num = (v: unknown, fallback: number, min = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.floor(v)) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Missing, corrupt or wrong-typed data never throws: bad fields fall back to defaults. Add migrations by `version` here. */
export function parseSave(raw: string | null | undefined): SaveData {
  const d = defaultSave();
  let o: any;
  try {
    o = raw ? JSON.parse(raw) : null;
  } catch {
    return d;
  }
  if (!o || typeof o !== 'object') return d;
  return {
    version: 1,
    level: num(o.level, d.level, 1),
    coins: num(o.coins, d.coins),
    boosters: {
      extraGate: num(o.boosters?.extraGate, d.boosters.extraGate),
      sortQueue: num(o.boosters?.sortQueue, d.boosters.sortQueue),
      shuffleBoard: num(o.boosters?.shuffleBoard, d.boosters.shuffleBoard),
    },
    settings: {
      sound: bool(o.settings?.sound, d.settings.sound),
      music: bool(o.settings?.music, d.settings.music),
      vibration: bool(o.settings?.vibration, d.settings.vibration),
      symbols: bool(o.settings?.symbols, d.settings.symbols),
    },
    tipsSeen: {
      extraGate: bool(o.tipsSeen?.extraGate, false),
      sortQueue: bool(o.tipsSeen?.sortQueue, false),
      shuffleBoard: bool(o.tipsSeen?.shuffleBoard, false),
    },
    adsRemoved: bool(o.adsRemoved, d.adsRemoved),
    lastDailyReward: typeof o.lastDailyReward === 'string' ? o.lastDailyReward : '',
    tutorialSeen: bool(o.tutorialSeen, d.tutorialSeen),
  };
}

/** Capacitor Preferences (falls back to localStorage in the browser). */
export class SaveManager {
  data: SaveData = defaultSave();

  async load() {
    try {
      this.data = parseSave((await Preferences.get({ key: KEY })).value);
    } catch {
      this.data = defaultSave();
    }
  }

  /** Fire-and-forget: a failed write must never break the game. */
  save() {
    Preferences.set({ key: KEY, value: JSON.stringify(this.data) }).catch(() => {});
  }
}

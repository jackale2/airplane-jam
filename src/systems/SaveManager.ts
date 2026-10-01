import { Preferences } from '@capacitor/preferences';
import { BOOSTER_IDS, TUNING, type BoosterId } from '../data/tuning.ts';
import { emptyStats, type Stats } from '../meta/achievements.ts';
import { COSMETICS, DEFAULT_COSMETICS, LIVERIES, OUTFITS, THEMES } from '../meta/cosmetics.ts';
import type { Mission, MissionKind, MissionState } from '../meta/missions.ts';
import type { DailyState } from '../meta/rewards.ts';

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  symbols: boolean;
  musicVol: number; // 0..1
  sfxVol: number; // 0..1
  reducedMotion: boolean;
}

export interface SaveData {
  version: 2;
  level: number; // highest unlocked campaign level
  stars: Record<string, number>; // best stars per won level
  coins: number;
  boosters: Record<BoosterId, number>;
  settings: Settings;
  /** One-time things already shown: tutorials, unlock popups, booster tips, postcards. */
  flags: Record<string, boolean>;
  adsRemoved: boolean;
  lastWinBonus: string; // day of the last first-win-of-the-day bonus
  daily: DailyState;
  missions: MissionState;
  achievements: Record<string, number>; // tiers claimed per achievement id
  stats: Stats;
  cosmetics: { owned: string[]; livery: string; outfit: string; theme: string };
  streak: number; // levels won in a row without failing
}

const KEY = 'airplane-jam-save';

export const defaultSave = (): SaveData => ({
  version: 2,
  level: 1,
  stars: {},
  coins: TUNING.startCoins,
  boosters: { ...TUNING.startBoosters },
  settings: { sound: true, music: true, vibration: true, symbols: true, musicVol: 0.6, sfxVol: 0.8, reducedMotion: false },
  flags: {},
  adsRemoved: false,
  lastWinBonus: '',
  daily: { lastClaim: '', day: 0 },
  missions: { date: '', list: [], bonusClaimed: false },
  achievements: {},
  stats: emptyStats(),
  cosmetics: { owned: COSMETICS.filter((c) => c.price === 0).map((c) => c.id), ...DEFAULT_COSMETICS },
  streak: 0,
});

const num = (v: unknown, fallback: number, min = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.floor(v)) : fallback);
const unit = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const oneOf = (v: unknown, allowed: readonly string[], fallback: string) => (typeof v === 'string' && allowed.includes(v) ? v : fallback);

const MISSION_KINDS: MissionKind[] = ['board', 'depart', 'win', 'perfect', 'color', 'chain', 'zen', 'booster'];

function parseMission(v: unknown): Mission | null {
  const o = obj(v);
  if (!MISSION_KINDS.includes(o.kind as MissionKind)) return null;
  const m: Mission = { kind: o.kind as MissionKind, target: num(o.target, 1, 1), progress: num(o.progress, 0), reward: num(o.reward, 0), claimed: bool(o.claimed, false) };
  if (typeof o.color === 'number') m.color = num(o.color, 0);
  return m;
}

/**
 * Missing, corrupt or wrong-typed data never throws: bad fields fall back to defaults.
 * Version 1 saves (before the world tour) are migrated: level, coins, boosters, settings and flags carry over.
 */
export function parseSave(raw: string | null | undefined): SaveData {
  const d = defaultSave();
  let o: Record<string, unknown>;
  try {
    o = obj(raw ? JSON.parse(raw) : null);
  } catch {
    return d;
  }
  if (!Object.keys(o).length) return d;
  const s = obj(o.settings);
  const b = obj(o.boosters);
  const flags: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(obj(o.flags))) if (v === true) flags[k] = true;
  // v1 fields
  for (const [k, v] of Object.entries(obj(o.tipsSeen))) if (v === true) flags[`tip_${k}`] = true;
  if (o.tutorialSeen === true) flags.tutorial = true;

  const stars: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(o.stars))) {
    const n = num(v, 0);
    if (/^\d+$/.test(k) && n >= 1) stars[k] = Math.min(3, n);
  }
  const st = obj(o.stats);
  const e = emptyStats();
  const stats = {
    passengers: num(st.passengers, 0),
    planes: num(st.planes, 0),
    wins: num(st.wins, 0),
    perfect: num(st.perfect, 0),
    hardWins: num(st.hardWins, 0),
    zenBoards: num(st.zenBoards, 0),
    zenPassengers: num(st.zenPassengers, 0),
    bestChain: num(st.bestChain, 0),
    loginDays: num(st.loginDays, 0),
    lastLogin: str(st.lastLogin, e.lastLogin),
    boostersUsed: num(st.boostersUsed, 0),
  };
  const achievements: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(o.achievements))) achievements[k] = num(v, 0);

  const m = obj(o.missions);
  const list = Array.isArray(m.list) ? m.list.map(parseMission).filter((x): x is Mission => x !== null).slice(0, 3) : [];
  const dl = obj(o.daily);
  const cz = obj(o.cosmetics);
  const known = new Set(COSMETICS.map((c) => c.id));
  const owned = new Set(d.cosmetics.owned);
  if (Array.isArray(cz.owned)) for (const id of cz.owned) if (typeof id === 'string' && known.has(id)) owned.add(id);
  const equip = (v: unknown, all: string[], fallback: string) => {
    const id = oneOf(v, all, fallback);
    return owned.has(id) ? id : fallback;
  };

  return {
    version: 2,
    level: num(o.level, d.level, 1),
    stars,
    coins: num(o.coins, d.coins),
    boosters: Object.fromEntries(BOOSTER_IDS.map((id) => [id, num(b[id], d.boosters[id])])) as Record<BoosterId, number>,
    settings: {
      sound: bool(s.sound, d.settings.sound),
      music: bool(s.music, d.settings.music),
      vibration: bool(s.vibration, d.settings.vibration),
      symbols: bool(s.symbols, d.settings.symbols),
      musicVol: unit(s.musicVol, d.settings.musicVol),
      sfxVol: unit(s.sfxVol, d.settings.sfxVol),
      reducedMotion: bool(s.reducedMotion, d.settings.reducedMotion),
    },
    flags,
    adsRemoved: bool(o.adsRemoved, d.adsRemoved),
    lastWinBonus: str(o.lastWinBonus, str(o.lastDailyReward, '')),
    daily: { lastClaim: str(dl.lastClaim, ''), day: num(dl.day, 0) },
    missions: { date: str(m.date, ''), list, bonusClaimed: bool(m.bonusClaimed, false) },
    achievements,
    stats,
    cosmetics: {
      owned: [...owned],
      livery: equip(cz.livery, LIVERIES, DEFAULT_COSMETICS.livery),
      outfit: equip(cz.outfit, OUTFITS, DEFAULT_COSMETICS.outfit),
      theme: equip(cz.theme, THEMES, DEFAULT_COSMETICS.theme),
    },
    streak: num(o.streak, 0),
  };
}

/** Capacitor Preferences (falls back to localStorage in the browser). */
export class SaveManager {
  data: SaveData = defaultSave();
  /** Called after every write (the cloud backup listens). */
  onFlush?: () => void;
  private timer: ReturnType<typeof setTimeout> | undefined;

  async load() {
    try {
      this.data = parseSave((await Preferences.get({ key: KEY })).value);
    } catch {
      this.data = defaultSave();
    }
  }

  /** Coalesces bursts of changes (boarding updates stats many times a second) into one write. */
  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 250);
  }

  /** Write now. Fire-and-forget: a failed write must never break the game. */
  flush() {
    clearTimeout(this.timer);
    this.timer = undefined;
    Preferences.set({ key: KEY, value: JSON.stringify(this.data) }).catch(() => {});
    this.onFlush?.();
  }

  /** Start over (Settings > Reset progress). */
  reset() {
    this.data = defaultSave();
    this.flush();
  }
}

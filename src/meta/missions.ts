import { makeRng } from '../core/rng.ts';
import { COLOR_NAMES } from '../data/colors.ts';
import { hashString } from './dates.ts';
import type { Reward } from './rewards.ts';

export type MissionKind = 'board' | 'depart' | 'win' | 'perfect' | 'color' | 'chain' | 'zen' | 'booster';

export interface Mission {
  kind: MissionKind;
  color?: number;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface MissionState {
  date: string;
  list: Mission[];
  bonusClaimed: boolean;
}

/** Gameplay facts that move missions, achievements and stats forward. */
export type MetaEvent =
  | { type: 'board'; color: number; zen: boolean }
  | { type: 'depart'; zen: boolean }
  | { type: 'win'; stars: number; hard: boolean }
  | { type: 'chain'; n: number }
  | { type: 'booster' }
  | { type: 'zenBoard' };

interface Template {
  kind: MissionKind;
  targets: [number, number, number];
  rewards: [number, number, number];
  needs?: 'zen' | 'boosters';
}

const TEMPLATES: Template[] = [
  { kind: 'board', targets: [80, 120, 180], rewards: [40, 60, 90] },
  { kind: 'depart', targets: [12, 20, 30], rewards: [40, 60, 90] },
  { kind: 'win', targets: [2, 3, 5], rewards: [50, 70, 100] },
  { kind: 'perfect', targets: [1, 2, 3], rewards: [50, 70, 100] },
  { kind: 'color', targets: [20, 30, 45], rewards: [40, 60, 90] },
  { kind: 'chain', targets: [8, 10, 12], rewards: [50, 70, 90] },
  { kind: 'zen', targets: [40, 70, 100], rewards: [40, 60, 90], needs: 'zen' },
  { kind: 'booster', targets: [1, 2, 3], rewards: [40, 60, 90], needs: 'boosters' },
];

/** Claiming all three missions of the day opens a bonus. */
export const MISSION_BONUS: Reward = { coins: 100, boosters: { shuffleBoard: 1 } };

/**
 * Three different missions for a day, the same all day for everyone at the same stage.
 * `colors` is how many passenger colors the player's current levels use.
 */
export function makeMissions(date: string, ctx: { level: number; colors: number; zen: boolean; boosters: boolean }): Mission[] {
  const rng = makeRng(hashString(`missions:${date}`));
  const pool = TEMPLATES.filter((t) => (t.needs !== 'zen' || ctx.zen) && (t.needs !== 'boosters' || ctx.boosters));
  const picked = rng.shuffle([...pool]).slice(0, 3);
  const maxTier = ctx.level < 10 ? 1 : ctx.level < 40 ? 2 : 3;
  return picked.map((t) => {
    const tier = rng.int(maxTier);
    const m: Mission = { kind: t.kind, target: t.targets[tier]!, progress: 0, reward: t.rewards[tier]!, claimed: false };
    if (t.kind === 'color') m.color = rng.int(Math.max(1, ctx.colors));
    return m;
  });
}

export function missionText(m: Mission) {
  const n = m.target;
  switch (m.kind) {
    case 'board':
      return `Board ${n} passengers`;
    case 'depart':
      return `Send off ${n} planes`;
    case 'win':
      return `Win ${n} levels`;
    case 'perfect':
      return n === 1 ? 'Get 3 stars on a level' : `Get 3 stars on ${n} levels`;
    case 'color':
      return `Board ${n} ${COLOR_NAMES[m.color ?? 0]} passengers`;
    case 'chain':
      return `Board ${n} passengers with one tap`;
    case 'zen':
      return `Board ${n} passengers in Zen mode`;
    case 'booster':
      return n === 1 ? 'Use a booster' : `Use ${n} boosters`;
  }
}

export const missionDone = (m: Mission) => m.progress >= m.target;

/** Apply one event; returns the missions it just completed. */
export function applyMissionEvent(list: Mission[], ev: MetaEvent): Mission[] {
  const done: Mission[] = [];
  for (const m of list) {
    if (missionDone(m)) continue;
    const before = m.progress;
    switch (m.kind) {
      case 'board':
        if (ev.type === 'board') m.progress++;
        break;
      case 'color':
        if (ev.type === 'board' && ev.color === m.color) m.progress++;
        break;
      case 'zen':
        if (ev.type === 'board' && ev.zen) m.progress++;
        break;
      case 'depart':
        if (ev.type === 'depart') m.progress++;
        break;
      case 'win':
        if (ev.type === 'win') m.progress++;
        break;
      case 'perfect':
        if (ev.type === 'win' && ev.stars === 3) m.progress++;
        break;
      case 'chain':
        if (ev.type === 'chain') m.progress = Math.max(m.progress, Math.min(ev.n, m.target));
        break;
      case 'booster':
        if (ev.type === 'booster') m.progress++;
        break;
    }
    if (m.progress !== before && missionDone(m)) done.push(m);
  }
  return done;
}

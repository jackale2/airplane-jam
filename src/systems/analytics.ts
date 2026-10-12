/**
 * Event layer using the event names of the studied game (docs/COMPETITOR_TEARDOWN.md, section 7). Nothing leaves
 * the device: events go to a small in-memory log and to whatever sink you plug in with `setSink`. Plug in
 * Firebase/Adjust there only together with a privacy-policy + Data Safety update, and only after the UMP consent.
 */
export type EventName =
  | 'StartNewGame'
  | 'WinGame'
  | 'FailGame'
  | 'RetryGame'
  | 'ReviveGame'
  | 'UseTools'
  | 'AdShow_Rv'
  | 'AdShow_Inter'
  | string; // milestone events such as ShowWinGameLevel10 and WatchRewardedVideo5

/** Level / rewarded-video counts that fire a milestone event (their lists, trimmed). */
export const LEVEL_MILESTONES = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 130, 150, 180, 200, 250, 300, 400, 500, 750, 1000];
export const RV_MILESTONES = [1, 5, 10, 20, 30, 40, 50, 75, 100];

/** The milestone event for reaching `n` (e.g. ShowWinGameLevel10), or null if `n` is not a milestone. */
export const milestone = (prefix: string, n: number, list: readonly number[]) => (list.includes(n) ? `${prefix}${n}` : null);

export type Sink = (name: EventName, params: Record<string, string | number>) => void;

const log: { t: number; name: EventName; params: Record<string, string | number> }[] = [];
let sink: Sink | undefined;

export const setSink = (s: Sink | undefined) => (sink = s);
export const recentEvents = () => log.slice();

export function track(name: EventName, params: Record<string, string | number> = {}) {
  log.push({ t: Date.now(), name, params });
  if (log.length > 200) log.shift();
  try {
    sink?.(name, params);
  } catch {
    /* analytics must never break the game */
  }
}

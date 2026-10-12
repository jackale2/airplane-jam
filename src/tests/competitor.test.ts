import { describe, expect, it } from 'vitest';
import { streakReward } from '../meta/rewards.ts';
import { interstitialGapMs, shouldShowInterstitial } from '../systems/AdsManager.ts';
import { LEVEL_MILESTONES, milestone, recentEvents, setSink, track } from '../systems/analytics.ts';
import { EconomyManager } from '../systems/EconomyManager.ts';
import { FULL_PATTERN, HAPTIC_EVENTS, HAPTIC_ROWS, hapticRow } from '../systems/haptics.ts';
import { MetaManager } from '../systems/MetaManager.ts';
import { defaultSave, parseSave, type SaveManager } from '../systems/SaveManager.ts';
import { BUBBLE_MS, smoothstep } from '../ui/ease.ts';

const fakeSave = () => ({ data: defaultSave(), save() {}, flush() {} }) as unknown as SaveManager;
const meta = () => {
  const save = fakeSave();
  const economy = new EconomyManager(save);
  return { save, economy, meta: new MetaManager(save, economy) };
};

describe('haptic table', () => {
  it('every event points at a row with sane values', () => {
    for (const kind of Object.keys(HAPTIC_EVENTS) as (keyof typeof HAPTIC_EVENTS)[]) {
      const r = hapticRow(kind);
      expect(r.amplitude).toBeGreaterThanOrEqual(1);
      expect(r.amplitude).toBeLessThanOrEqual(255);
      expect(r.ms).toBeGreaterThan(0);
      expect(r.ms).toBeLessThanOrEqual(50);
      expect(r.effect).toBeGreaterThanOrEqual(-1);
    }
    expect(Object.keys(HAPTIC_ROWS)).toHaveLength(9);
  });
  it('win/lose is the strongest pulse, boarding the softest', () => {
    expect(hapticRow('win').amplitude).toBe(Math.max(...Object.values(HAPTIC_ROWS).map((r) => r.amplitude)));
    expect(hapticRow('board').amplitude).toBe(Math.min(...Object.values(HAPTIC_ROWS).map((r) => r.amplitude)));
  });
  it('the full-plane pattern is three 30 ms pulses with matching amplitudes', () => {
    expect(FULL_PATTERN.timings).toEqual([0, 30, 45, 30, 45, 30]);
    expect(FULL_PATTERN.amplitudes).toHaveLength(FULL_PATTERN.timings.length);
    expect(FULL_PATTERN.amplitudes.filter((a) => a > 0)).toHaveLength(3);
  });
});

describe('interstitial cooldown bands', () => {
  it('the cooldown shrinks as the player goes deeper', () => {
    expect([6, 29, 30, 99, 100, 199, 200, 999].map((l) => interstitialGapMs(l) / 1000)).toEqual([150, 150, 120, 120, 90, 90, 45, 45]);
  });
  it('is enforced at the band edge', () => {
    const base = { level: 100, lastShownLevel: 0, now: 1_000_000, adsRemoved: false };
    expect(shouldShowInterstitial({ ...base, lastShownAt: base.now - 89_000 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, lastShownAt: base.now - 90_000 })).toBe(true);
    expect(shouldShowInterstitial({ ...base, level: 10, lastShownAt: base.now - 149_000 })).toBe(false);
  });
});

describe('win streak ladder', () => {
  it('pays only at the listed streak lengths', () => {
    expect([1, 2, 3, 4, 5, 7, 10, 15, 16].map((n) => streakReward(n) !== null)).toEqual([false, false, true, false, true, true, true, true, false]);
  });
  it('is granted by completeLevel and the streak keeps counting', () => {
    const { meta: m, save } = meta();
    let last = null as ReturnType<typeof m.completeLevel> | null;
    for (let i = 1; i <= 3; i++) last = m.completeLevel(i, 3);
    expect(last!.result.streakBonus).toEqual({ boosters: { extraGate: 1 } });
    expect(save.data.boosters.extraGate).toBe(1);
    expect(save.data.streak).toBe(3);
  });
});

describe('mercy after repeated fails', () => {
  it('the second fail in a row on one level grants one free Gate, once', () => {
    const { meta: m, save } = meta();
    expect(m.failLevel(7)).toBe(false);
    expect(m.failLevel(7)).toBe(true);
    expect(m.failLevel(7)).toBe(false);
    expect(save.data.boosters.extraGate).toBe(1);
  });
  it('failing different levels, or winning in between, restarts the count', () => {
    const { meta: m, save } = meta();
    m.failLevel(7);
    expect(m.failLevel(8)).toBe(false);
    m.failLevel(9);
    m.completeLevel(9, 1);
    expect(m.failLevel(9)).toBe(false);
    expect(save.data.boosters.extraGate).toBe(0);
  });
  it('survives a save round trip and a damaged save', () => {
    const s = defaultSave();
    s.struggle = { level: 4, fails: 1 };
    s.rvWatched = 9;
    const back = parseSave(JSON.stringify(s));
    expect(back.struggle).toEqual({ level: 4, fails: 1 });
    expect(back.rvWatched).toBe(9);
    expect(parseSave(JSON.stringify({ struggle: 'x', rvWatched: -3 })).struggle).toEqual({ level: 0, fails: 0 });
  });
});

describe('analytics', () => {
  it('names milestone events only at listed counts', () => {
    expect(milestone('ShowWinGameLevel', 10, LEVEL_MILESTONES)).toBe('ShowWinGameLevel10');
    expect(milestone('ShowWinGameLevel', 11, LEVEL_MILESTONES)).toBeNull();
  });
  it('keeps a bounded log and a throwing sink never breaks the caller', () => {
    setSink(() => {
      throw new Error('boom');
    });
    for (let i = 0; i < 250; i++) track('WinGame', { i });
    setSink(undefined);
    expect(recentEvents()).toHaveLength(200);
  });
});

describe('bubble easing', () => {
  it('goes 0 to 1 smoothly in 267 ms', () => {
    expect(BUBBLE_MS).toBe(267);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0.25)).toBeLessThan(0.25);
  });
});

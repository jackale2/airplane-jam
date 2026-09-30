import { describe, expect, it } from 'vitest';
import { shouldShowInterstitial } from '../systems/AdsManager.ts';
import { defaultSave, parseSave } from '../systems/SaveManager.ts';
import { queuePoints } from '../ui/queueShapes.ts';

describe('SaveManager.parseSave', () => {
  it('starts fresh when the save is missing or corrupt', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('')).toEqual(defaultSave());
    expect(parseSave('{not json')).toEqual(defaultSave());
    expect(parseSave('42')).toEqual(defaultSave());
  });

  it('keeps valid fields and repairs bad ones', () => {
    const s = parseSave(JSON.stringify({ level: 12, coins: 'lots', boosters: { extraGate: 3 }, settings: { sound: false }, adsRemoved: true }));
    expect(s.level).toBe(12);
    expect(s.coins).toBe(0);
    expect(s.boosters).toEqual({ extraGate: 3, sortQueue: 1, shuffleBoard: 1 });
    expect(s.settings).toEqual({ sound: false, music: true, vibration: true, symbols: true });
    expect(s.adsRemoved).toBe(true);
  });

  it('never allows negative or fractional numbers', () => {
    const s = parseSave(JSON.stringify({ level: -4, coins: -50.7 }));
    expect(s.level).toBe(1);
    expect(s.coins).toBe(0);
  });
});

describe('interstitial rules', () => {
  const base = { level: 6, lastShownLevel: -99, lastShownAt: -Infinity, now: 1_000_000, adsRemoved: false };
  it('starts at level 6', () => {
    expect(shouldShowInterstitial({ ...base, level: 5 })).toBe(false);
    expect(shouldShowInterstitial(base)).toBe(true);
  });
  it('at most once every 3 levels', () => {
    expect(shouldShowInterstitial({ ...base, level: 8, lastShownLevel: 6 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, level: 9, lastShownLevel: 6 })).toBe(true);
  });
  it('never within 90 seconds of the previous ad', () => {
    expect(shouldShowInterstitial({ ...base, level: 20, lastShownAt: base.now - 89_000 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, level: 20, lastShownAt: base.now - 90_000 })).toBe(true);
  });
  it('Remove Ads disables them', () => {
    expect(shouldShowInterstitial({ ...base, adsRemoved: true })).toBe(false);
  });
});

describe('queue shapes', () => {
  it('places every slot inside the box, head first', () => {
    const box = { x: 90, y: 200, w: 900, h: 350 };
    for (const shape of ['loop', 'star', 'heart', 'spiral'] as const) {
      const pts = queuePoints(shape, 16, box);
      expect(pts).toHaveLength(16);
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(p.x).toBeLessThanOrEqual(box.x + box.w + 1);
        expect(p.y).toBeGreaterThanOrEqual(box.y - 1);
        expect(p.y).toBeLessThanOrEqual(box.y + box.h + 1);
      }
      expect(pts[0]!.y).toBeGreaterThan(box.y + box.h * 0.6); // head sits low, next to the gate row
    }
  });
});

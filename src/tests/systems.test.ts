import { describe, expect, it } from 'vitest';
import { shouldShowInterstitial } from '../systems/AdsManager.ts';
import { defaultSave, parseSave } from '../systems/SaveManager.ts';
import { layoutQueue, queuePoints } from '../ui/queueShapes.ts';
import { gameLayout, viewFor } from '../layout/view.ts';

describe('SaveManager.parseSave', () => {
  it('starts fresh when the save is missing or corrupt', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('')).toEqual(defaultSave());
    expect(parseSave('{not json')).toEqual(defaultSave());
    expect(parseSave('42')).toEqual(defaultSave());
  });

  it('keeps valid fields and repairs bad ones', () => {
    const s = parseSave(JSON.stringify({ level: 12, coins: 'lots', boosters: { extraGate: 3 }, settings: { sound: false, musicVol: 7 }, adsRemoved: true }));
    expect(s.level).toBe(12);
    expect(s.coins).toBe(defaultSave().coins);
    expect(s.boosters).toEqual({ extraGate: 3, sortQueue: 0, shuffleBoard: 0 });
    expect(s.settings).toEqual({ sound: false, music: true, vibration: true, symbols: true, musicVol: 1, sfxVol: 0.8, reducedMotion: false });
    expect(s.adsRemoved).toBe(true);
  });

  it('migrates a version 1 save', () => {
    const v1 = { version: 1, level: 31, coins: 450, boosters: { extraGate: 2, sortQueue: 1, shuffleBoard: 0 }, settings: { sound: true, music: false, vibration: true, symbols: false }, tipsSeen: { extraGate: true, sortQueue: false }, adsRemoved: false, lastDailyReward: '2026-09-29', tutorialSeen: true };
    const s = parseSave(JSON.stringify(v1));
    expect(s.version).toBe(2);
    expect([s.level, s.coins]).toEqual([31, 450]);
    expect(s.boosters).toEqual({ extraGate: 2, sortQueue: 1, shuffleBoard: 0 });
    expect(s.settings.music).toBe(false);
    expect(s.settings.symbols).toBe(false);
    expect(s.flags).toEqual({ tip_extraGate: true, tutorial: true });
    expect(s.lastWinBonus).toBe('2026-09-29');
    expect(s.stars).toEqual({});
    expect(s.cosmetics).toEqual(defaultSave().cosmetics);
  });

  it('only keeps real stars, known cosmetics, and equips only what is owned', () => {
    const s = parseSave(JSON.stringify({ stars: { 1: 3, 2: 9, x: 2, 3: 0 }, cosmetics: { owned: ['racer', 'nope', 5], livery: 'racer', outfit: 'royal', theme: 'mars' } }));
    expect(s.stars).toEqual({ 1: 3, 2: 3 });
    expect(s.cosmetics.owned).toContain('racer');
    expect(s.cosmetics.owned).not.toContain('nope');
    expect(s.cosmetics.livery).toBe('racer');
    expect(s.cosmetics.outfit).toBe('casual'); // not owned
    expect(s.cosmetics.theme).toBe('day'); // unknown
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

  it('sizes travelers to the panel without stacking them on each other', () => {
    for (const [cw, ch] of [[360, 640], [390, 844], [768, 1024], [820, 1180], [1280, 800], [1920, 1080]] as const) {
      const q = gameLayout(viewFor(cw, ch)).queue;
      for (const shape of ['loop', 'star', 'heart', 'spiral'] as const) {
        const { pts, paxH } = layoutQueue(shape, 14, q);
        expect(paxH).toBeGreaterThan(50);
        expect(paxH).toBeLessThanOrEqual(150);
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]!;
          expect(p.x).toBeGreaterThan(q.x);
          expect(p.x).toBeLessThan(q.x + q.w);
          expect(p.y - paxH * 0.95).toBeGreaterThan(q.y); // heads stay inside the panel
          for (let j = i + 2; j < pts.length; j++) {
            const stacked = Math.abs(p.x - pts[j]!.x) < paxH * 0.45 && Math.abs(p.y - pts[j]!.y) < paxH * 0.75;
            expect(stacked, `${shape} ${cw}x${ch} slots ${i},${j}`).toBe(false);
          }
        }
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { Game } from '../core/Game.ts';
import { generateZenLevel, validateLevel } from '../core/Generator.ts';
import { solve } from '../core/Solver.ts';
import { ACHIEVEMENTS, achievementView } from '../meta/achievements.ts';
import { dayKey, daysBetween } from '../meta/dates.ts';
import { destinationFor, destinationRange, DESTINATIONS } from '../meta/destinations.ts';
import { applyMissionEvent, makeMissions, missionText } from '../meta/missions.ts';
import { isHardLevel, starsFor, winReward } from '../meta/progress.ts';
import { claimDaily, DAILY_REWARDS, dailyAvailable } from '../meta/rewards.ts';
import { EconomyManager } from '../systems/EconomyManager.ts';
import { MetaManager } from '../systems/MetaManager.ts';
import { defaultSave, type SaveManager } from '../systems/SaveManager.ts';

const fakeSave = () => ({ data: defaultSave(), save() {}, flush() {} }) as unknown as SaveManager;

describe('stars and rewards', () => {
  it('3 stars for a clean win, 2 with one booster, 1 otherwise or after a continue', () => {
    expect(starsFor({ boostersUsed: 0, continues: 0 })).toBe(3);
    expect(starsFor({ boostersUsed: 1, continues: 0 })).toBe(2);
    expect(starsFor({ boostersUsed: 2, continues: 0 })).toBe(1);
    expect(starsFor({ boostersUsed: 0, continues: 1 })).toBe(1);
  });
  it('every 10th level from 20 is HARD and pays double', () => {
    expect([10, 19, 20, 30, 35, 100].map(isHardLevel)).toEqual([false, false, true, true, false, true]);
    expect(winReward(30, 3, false).total).toBe(2 * winReward(31, 3, false).total);
    expect(winReward(1, 1, true).total).toBe(20 + 50);
  });
});

describe('dates', () => {
  it('counts days between local day keys', () => {
    expect(daysBetween('2026-09-29', '2026-10-01')).toBe(2);
    expect(Number.isNaN(daysBetween('x', '2026-10-01'))).toBe(true);
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('destinations', () => {
  it('changes every 20 levels and loops round the world', () => {
    expect(destinationFor(1).dest.name).toBe('Sunny Harbor');
    expect(destinationFor(20).index).toBe(0);
    expect(destinationFor(21).dest.name).toBe('Paris');
    expect(destinationFor(20 * DESTINATIONS.length + 1)).toMatchObject({ tour: 2, dest: { name: 'Sunny Harbor' } });
    expect(destinationRange(1)).toEqual({ first: 21, last: 40 });
  });
});

describe('daily gifts', () => {
  it('one gift a day, in order, never reset by a missed day', () => {
    let s = { lastClaim: '', day: 0 };
    const a = claimDaily(s, '2026-09-30')!;
    expect(a.reward).toEqual(DAILY_REWARDS[0]);
    s = a.next;
    expect(dailyAvailable(s, '2026-09-30')).toBe(false);
    expect(claimDaily(s, '2026-09-30')).toBeNull();
    const b = claimDaily(s, '2026-10-05')!; // five days later: simply the next box
    expect(b.reward).toEqual(DAILY_REWARDS[1]);
  });
});

describe('missions', () => {
  it('deals three different missions, the same all day', () => {
    const ctx = { level: 30, colors: 4, zen: true, boosters: true };
    const a = makeMissions('2026-09-30', ctx);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((m) => m.kind)).size).toBe(3);
    expect(makeMissions('2026-09-30', ctx)).toEqual(a);
    for (const m of a) expect(missionText(m).length).toBeGreaterThan(5);
  });
  it('never asks for Zen or boosters before they are unlocked', () => {
    for (let d = 1; d <= 28; d++) {
      const list = makeMissions(`2026-02-${String(d).padStart(2, '0')}`, { level: 2, colors: 2, zen: false, boosters: false });
      expect(list.some((m) => m.kind === 'zen' || m.kind === 'booster')).toBe(false);
      for (const m of list) if (m.kind === 'color') expect(m.color).toBeLessThan(2);
    }
  });
  it('moves forward with play and reports completion once', () => {
    const list = [
      { kind: 'board' as const, target: 2, progress: 0, reward: 10, claimed: false },
      { kind: 'color' as const, color: 3, target: 1, progress: 0, reward: 10, claimed: false },
      { kind: 'chain' as const, target: 8, progress: 0, reward: 10, claimed: false },
    ];
    expect(applyMissionEvent(list, { type: 'board', color: 1, zen: false })).toHaveLength(0);
    expect(applyMissionEvent(list, { type: 'board', color: 3, zen: false }).map((m) => m.kind)).toEqual(['board', 'color']);
    expect(applyMissionEvent(list, { type: 'board', color: 3, zen: false })).toHaveLength(0);
    expect(applyMissionEvent(list, { type: 'chain', n: 5 })).toHaveLength(0);
    expect(applyMissionEvent(list, { type: 'chain', n: 9 }).map((m) => m.kind)).toEqual(['chain']);
  });
});

describe('achievements', () => {
  it('walk through their tiers', () => {
    const def = ACHIEVEMENTS.find((a) => a.id === 'wins')!;
    expect(achievementView(def, 3, 0)).toMatchObject({ target: 5, claimable: false });
    expect(achievementView(def, 5, 0)).toMatchObject({ target: 5, claimable: true, reward: 50 });
    expect(achievementView(def, 30, 1)).toMatchObject({ target: 25, claimable: true, reward: 100 });
    expect(achievementView(def, 9999, def.tiers.length)).toMatchObject({ target: null, claimable: false });
  });
});

describe('MetaManager', () => {
  it('unlocks the next level, keeps the best stars, and pays for a new destination once', () => {
    const save = fakeSave();
    save.data.level = 20;
    const eco = new EconomyManager(save);
    const meta = new MetaManager(save, eco);
    const coins = save.data.coins;
    const r = meta.completeLevel(20, 2);
    expect(r.result).toMatchObject({ stars: 2, firstClear: true, arrived: 1 });
    expect(save.data.level).toBe(21);
    expect(save.data.coins).toBe(coins + 200);
    const again = meta.completeLevel(20, 3); // replay
    expect(again.result).toMatchObject({ bestStars: 3, firstClear: false, arrived: null });
    expect(save.data.level).toBe(21);
    expect(meta.completeLevel(20, 1).result.bestStars).toBe(3);
  });

  it('tracks stats, completes missions, and pays each claim once', () => {
    const save = fakeSave();
    save.data.level = 30;
    const eco = new EconomyManager(save);
    const meta = new MetaManager(save, eco);
    meta.refreshDay('2026-09-30');
    save.data.missions.list = [
      { kind: 'depart', target: 1, progress: 0, reward: 40, claimed: false },
      { kind: 'win', target: 1, progress: 0, reward: 50, claimed: false },
      { kind: 'booster', target: 1, progress: 0, reward: 40, claimed: false },
    ];
    expect(meta.track({ type: 'depart', zen: false }).map((n) => n.kind)).toContain('mission');
    meta.track({ type: 'booster' });
    meta.completeLevel(30, 3);
    expect(meta.badges.missions).toBe(3);
    const coins = save.data.coins;
    expect(meta.claimMission(0)).toEqual({ coins: 40 });
    expect(meta.claimMission(0)).toBeNull();
    meta.claimMission(1);
    meta.claimMission(2);
    expect(save.data.coins).toBe(coins + 130);
    expect(meta.bonusReady).toBe(true);
    expect(meta.claimMissionBonus()).not.toBeNull();
    expect(meta.claimMissionBonus()).toBeNull();
    expect(save.data.stats).toMatchObject({ planes: 1, wins: 1, perfect: 1, hardWins: 1, boostersUsed: 1 });
  });

  it('buys cosmetics only when affordable and equips owned ones for free', () => {
    const save = fakeSave();
    save.data.coins = 700;
    const meta = new MetaManager(save, new EconomyManager(save));
    expect(meta.buyOrEquip('polka')).toBe('poor');
    expect(meta.buyOrEquip('racer')).toBe('bought');
    expect(save.data.coins).toBe(100);
    expect(meta.equipped('livery')).toBe('racer');
    expect(meta.buyOrEquip('classic')).toBe('equipped');
    expect(meta.buyOrEquip('racer')).toBe('equipped');
    expect(save.data.coins).toBe(100);
  });

  it('counts each login day once', () => {
    const save = fakeSave();
    const meta = new MetaManager(save, new EconomyManager(save));
    meta.refreshDay('2026-09-30');
    meta.refreshDay('2026-09-30');
    meta.refreshDay('2026-10-01');
    expect(save.data.stats.loginDays).toBe(2);
  });
});

describe('Game helpers for boosters and Zen', () => {
  it('resume boards passengers that can board after the line changed', () => {
    const g = Game.create({
      id: 0, seed: 0, cols: 4, rows: 3, gateSlots: 2, queueShape: 'loop', parMinSlots: 2,
      planes: [{ id: 1, color: 0, length: 2, x: 1, y: 0, dir: 'up' }],
      queue: [1, 1, 1, 1, 0, 0, 0, 0],
    });
    // park the color-0 plane; the head is color 1, so nobody boards and the level is stuck
    g.tap(1);
    expect(g.status).toBe('failed');
    expect(g.filled.get(1)).toBe(0);
    expect(g.assistQueue()).toBe(true);
    expect(g.queue).toEqual([0, 1, 1, 1, 1, 0, 0, 0]); // one matching traveler moved to the front
    const ev = g.resume();
    expect(ev.filter((e) => e.type === 'PASSENGER_BOARDED')).toHaveLength(1);
    expect(g.status).toBe('failed'); // still stuck: Zen assists again, a level would offer a gate
  });

  it('Zen boards are valid, solvable and use their own colors', () => {
    const colorSets = new Set<string>();
    for (const seed of [1, 2, 3, 17, 99]) {
      const l = generateZenLevel(seed);
      validateLevel(l);
      expect(solve(Game.create(l))).toBe('win');
      colorSets.add([...new Set(l.planes.map((p) => p.color))].sort().join());
    }
    expect(colorSets.size).toBeGreaterThan(1);
  });
});

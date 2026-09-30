import { describe, expect, it } from 'vitest';
import { checkLevel } from '../core/devChecks.ts';
import { Game } from '../core/Game.ts';
import { generateLevel } from '../core/Generator.ts';
import { shuffleBoard, solve } from '../core/Solver.ts';
import { makeRng } from '../core/rng.ts';
import type { LevelData } from '../core/types.ts';
import { EconomyManager } from '../systems/EconomyManager.ts';
import { defaultSave, type SaveManager } from '../systems/SaveManager.ts';

describe('dev level checks', () => {
  it('flags overlapping planes and planes outside the grid', () => {
    const bad: LevelData = {
      id: 1, seed: 0, cols: 3, rows: 3, gateSlots: 2, queueShape: 'loop', parMinSlots: 2, queue: [0, 0, 0, 0, 1, 1, 1, 1],
      planes: [
        { id: 1, color: 0, length: 2, x: 1, y: 0, dir: 'right' }, // cells (1,0),(0,0)
        { id: 2, color: 1, length: 2, x: 1, y: 0, dir: 'down' }, // overlaps (1,0), body reaches (1,-1) above the grid
      ],
    };
    const r = checkLevel(bad);
    expect(r.errors.some((e) => e.includes('claimed by planes 1 and 2'))).toBe(true);
    expect(r.errors.some((e) => e.includes('leaves the'))).toBe(true);
  });

  it('shipped levels 1..100 have no errors', async () => {
    const levels = (await import('../data/levels.json')).default as LevelData[];
    for (const l of levels) expect(checkLevel(l).errors, `level ${l.id}`).toEqual([]);
  });
});

describe('shuffleBoard', () => {
  it('only applies layouts the solver can still win, otherwise leaves the board alone', () => {
    for (const id of [5, 30]) {
      const g = Game.create(generateLevel(id, false));
      const before = JSON.stringify(g.board.list());
      const ok = shuffleBoard(g, makeRng(id));
      if (ok) expect(solve(g.clone())).toBe('win');
      else expect(JSON.stringify(g.board.list())).toBe(before);
    }
  });
});

describe('coins persist and grow', () => {
  it('a win pays the base, the star bonus and the first-win-of-the-day bonus, and the balance is stored in the save', () => {
    const save = { data: defaultSave(), save() {}, flush() {} } as unknown as SaveManager;
    const eco = new EconomyManager(save);
    const start = save.data.coins;
    const first = eco.claimWin(1, 3);
    expect(first.total).toBe(20 + 20 + 50);
    expect(save.data.coins).toBe(start + 90);
    const second = eco.claimWin(2, 1);
    expect(second.total).toBe(20);
    expect(save.data.coins).toBe(start + 110);
    expect(eco.spend(10_000)).toBe(false);
    expect(eco.spend(40)).toBe(true);
    expect(save.data.coins).toBe(start + 70);
  });

  it('HARD levels pay double', () => {
    const save = { data: defaultSave(), save() {}, flush() {} } as unknown as SaveManager;
    save.data.lastWinBonus = new Date().toISOString(); // not today's key: bonus still available, so claim it first
    const eco = new EconomyManager(save);
    eco.claimWin(1, 1);
    expect(eco.claimWin(20, 3).total).toBe((20 + 20) * 2);
  });
});

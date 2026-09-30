import { describe, expect, it } from 'vitest';
import { Game } from '../core/Game.ts';
import { generateLevel, validateLevel } from '../core/Generator.ts';
import { shuffleBoard, solve } from '../core/Solver.ts';
import { makeRng } from '../core/rng.ts';
import type { LevelData } from '../core/types.ts';

const base = (over: Partial<LevelData>): LevelData => ({
  id: 0, seed: 0, cols: 4, rows: 3, gateSlots: 2, planes: [], queue: [], queueShape: 'loop', parMinSlots: 2, ...over,
});

describe('Game rules', () => {
  // 4x3 grid. Plane 2 (color 1) stands on plane 1's exit path, so plane 1 is blocked until plane 2 leaves.
  const level = base({
    planes: [
      { id: 1, color: 0, length: 2, x: 1, y: 0, dir: 'right' }, // cells (1,0),(0,0); path (2,0),(3,0)
      { id: 2, color: 1, length: 2, x: 3, y: 1, dir: 'down' }, // cells (3,1),(3,0); path (3,2)
      { id: 3, color: 0, length: 2, x: 1, y: 2, dir: 'left' }, // cells (1,2),(2,2); path (0,2)
    ],
    queue: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  });

  it('a blocked plane bumps and changes nothing', () => {
    const g = Game.create(level);
    const before = JSON.stringify([g.board.ids(), g.gate, g.queueIdx]);
    expect(g.tap(1).map((e) => e.type)).toEqual(['PLANE_BUMP']);
    expect(JSON.stringify([g.board.ids(), g.gate, g.queueIdx])).toBe(before);
  });

  it('parks in the first free slot, boards, departs when full, reuses slots, and wins', () => {
    const g = Game.create(level);
    const ev = g.tap(2);
    expect(ev.map((e) => e.type)).toEqual(['PLANE_TAXI', 'PLANE_PARKED', ...Array(4).fill('PASSENGER_BOARDED'), 'PLANE_DEPARTED']);
    expect(g.gate).toEqual([null, null]);
    expect(g.tap(1).at(-1)?.type).toBe('PLANE_DEPARTED');
    expect(g.tap(3).at(-1)?.type).toBe('LEVEL_WON');
    expect(g.status).toBe('won');
    expect(g.queueIdx).toBe(g.queue.length);
  });

  it('never parks in an occupied slot', () => {
    // head is color 1, so plane 3 (color 0) parks without boarding and holds gate 0
    const g = Game.create(level);
    g.tap(3);
    expect(g.gate).toEqual([3, null]);
    const ev = g.tap(2); // must take gate 1, not overwrite gate 0
    expect(ev.find((e) => e.type === 'PLANE_PARKED')).toMatchObject({ gate: 1 });
    // its 4 passengers board, it departs, then the queue head turns to color 0 and plane 3 fills up
    expect(ev.filter((e) => e.type === 'PLANE_DEPARTED').map((e) => (e as { plane: number }).plane)).toEqual([2, 3]);
    expect(g.gate).toEqual([null, null]);
  });

  it('fails when every gate is full and nothing can board, and revive continues', () => {
    const g = Game.create(base({
      gateSlots: 1,
      planes: [
        { id: 1, color: 0, length: 2, x: 1, y: 0, dir: 'right' },
        { id: 2, color: 1, length: 2, x: 1, y: 2, dir: 'right' },
      ],
      queue: [1, 1, 1, 1, 0, 0, 0, 0],
    }));
    expect(g.tap(1).at(-1)?.type).toBe('LEVEL_FAILED');
    expect(g.status).toBe('failed');
    expect(g.tap(2)).toEqual([]); // no taps once over
    g.addGate(); // revive
    expect(g.status).toBe('playing');
    expect(solve(g)).toBe('win');
  });

  it('sortQueue groups the next passengers by color', () => {
    const g = Game.create(base({ queue: [0, 1, 0, 1, 0, 1, 0, 1, 2, 2] }));
    expect(g.sortQueue()).toBe(true);
    expect(g.queue).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2]);
  });
});

describe('Shipped levels', () => {
  it('has 100 valid, solvable levels in order', async () => {
    const levels = (await import('../data/levels.json')).default as LevelData[];
    expect(levels).toHaveLength(100);
    levels.forEach((l, i) => {
      expect(l.id).toBe(i + 1);
      validateLevel(l);
      expect(solve(Game.create(l))).toBe('win');
    });
  });
});

describe('Generator', () => {
  it('generates 200 solvable levels that satisfy the color invariant', () => {
    for (let id = 1; id <= 200; id++) {
      const level = generateLevel(id, false);
      validateLevel(level);
      expect(solve(Game.create(level))).toBe('win');
    }
  });

  it('is deterministic', () => {
    expect(generateLevel(7, false)).toEqual(generateLevel(7, false));
  });

  it('shuffleBoard keeps the same planes', () => {
    const g = Game.create(generateLevel(30, false));
    const ids = g.board.ids().sort();
    shuffleBoard(g, makeRng(1));
    expect(g.board.ids().sort()).toEqual(ids);
  });
});

import { cellSize, W } from '../config.ts';
import { Game } from './Game.ts';
import { planeCells } from './Board.ts';
import { solve, type SolveResult } from './Solver.ts';
import type { LevelData } from './types.ts';

export interface LevelReport {
  errors: string[];
  warnings: string[];
  solvable: SolveResult;
}

/** Smallest comfortable touch target, in CSS px. */
const MIN_TOUCH = 44;
/** Reference phone width for the touch-target warning. */
const REF_WIDTH = 360;

/**
 * Dev-only sanity checks for one level: no cell claimed by two planes, no plane outside the grid,
 * the color/seat invariant, solvability, and whether cells are big enough to tap on a 360 px phone.
 */
export function checkLevel(level: LevelData): LevelReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const owner = new Map<string, number>();
  for (const p of level.planes) {
    for (const [x, y] of planeCells(p)) {
      if (x < 0 || y < 0 || x >= level.cols || y >= level.rows) {
        errors.push(`plane ${p.id} leaves the ${level.cols}x${level.rows} grid at (${x},${y})`);
        continue;
      }
      const k = `${x},${y}`;
      const other = owner.get(k);
      if (other !== undefined) errors.push(`cell (${x},${y}) is claimed by planes ${other} and ${p.id}`);
      else owner.set(k, p.id);
    }
  }
  const seats = new Map<number, number>();
  for (const p of level.planes) seats.set(p.color, (seats.get(p.color) ?? 0) + Game.capacity(p));
  const pax = new Map<number, number>();
  for (const c of level.queue) pax.set(c, (pax.get(c) ?? 0) + 1);
  for (const c of new Set([...seats.keys(), ...pax.keys()])) {
    if (seats.get(c) !== pax.get(c)) errors.push(`color ${c}: ${pax.get(c) ?? 0} passengers for ${seats.get(c) ?? 0} seats`);
  }

  let solvable: SolveResult = 'lose';
  if (errors.length === 0) solvable = solve(Game.create(level));
  if (solvable !== 'win') errors.push(`level is not provably solvable (solver says ${solvable})`);

  const cellOnPhone = (cellSize(level.cols, level.rows) * REF_WIDTH) / W;
  if (cellOnPhone < MIN_TOUCH) {
    warnings.push(`cells are ${cellOnPhone.toFixed(0)} px on a ${REF_WIDTH} px screen (< ${MIN_TOUCH}); taps snap to the nearest plane to compensate`);
  }
  return { errors, warnings, solvable };
}

/** Logs a report to the console (errors loudly, warnings once per level). */
export function logLevelCheck(level: LevelData) {
  const r = checkLevel(level);
  const tag = `[level ${level.id}]`;
  r.errors.forEach((e) => console.error(tag, e));
  r.warnings.forEach((w) => console.warn(tag, w));
  if (!r.errors.length) console.info(tag, `valid, solvable (${r.solvable})`);
  return r;
}

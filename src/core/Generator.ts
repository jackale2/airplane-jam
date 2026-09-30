import { Game } from './Game.ts';
import { layoutPlanes } from './layout.ts';
import { makeRng, type Rng } from './rng.ts';
import { parMinSlots, solve } from './Solver.ts';
import type { LevelData, PlaneData, QueueShape } from './types.ts';

interface Band {
  from: number;
  to: number; // last level of the band; Infinity for the endless band
  cols: number;
  rows: number;
  planes: [number, number];
  colors: [number, number];
  lengths: (2 | 3 | 4)[];
  gateSlots: number | [number, number];
}

/**
 * The PRD's difficulty table. Plane counts are TARGETS: the grid cannot hold e.g. 50 planes in
 * 96 cells, so the generator places until a plane no longer fits (see `MIN_FILL`).
 */
export const BANDS: Band[] = [
  { from: 1, to: 5, cols: 5, rows: 6, planes: [5, 8], colors: [2, 2], lengths: [2], gateSlots: 6 },
  { from: 6, to: 20, cols: 6, rows: 8, planes: [8, 16], colors: [3, 4], lengths: [2, 3], gateSlots: 6 },
  { from: 21, to: 50, cols: 7, rows: 10, planes: [16, 30], colors: [4, 6], lengths: [2, 3, 4], gateSlots: 5 },
  { from: 51, to: 100, cols: 8, rows: 12, planes: [30, 50], colors: [6, 8], lengths: [2, 3, 4], gateSlots: 5 },
  { from: 101, to: Infinity, cols: 9, rows: 14, planes: [45, 70], colors: [8, 8], lengths: [2, 3, 4], gateSlots: [4, 5] },
];

const SHAPES: QueueShape[] = ['loop', 'star', 'heart', 'spiral'];
const ATTEMPTS = 25;
/** A level is accepted once it holds at least this share of the band's minimum plane count. */
const MIN_FILL = 0.6;

const lerp = (r: [number, number], t: number) => Math.round(r[0] + (r[1] - r[0]) * t);

export function bandFor(id: number): Band {
  return BANDS.find((b) => id >= b.from && id <= b.to)!;
}

/** Queue from per-color seat counts; `mix` 0 keeps colors in runs of 8, 1 interleaves them fully. */
export function buildQueue(seats: number[], mix: number, rng: Rng): number[] {
  // mix < 0: each color in one solid run
  const runLen = mix < 0 ? Infinity : Math.max(1, Math.round(8 * (1 - mix)));
  const runs: number[][] = [];
  seats.forEach((n, color) => {
    for (let left = n; left > 0; left -= runLen) runs.push(Array(Math.min(runLen, left)).fill(color));
  });
  return rng.shuffle(runs).flat();
}

function tryLevel(id: number, seed: number, extraSlots: number): LevelData | null {
  const rng = makeRng(seed);
  const band = bandFor(id);
  const t = band.to === Infinity ? Math.min(1, (id - band.from) / 100) : (id - band.from) / (band.to - band.from);
  const target = lerp(band.planes, t);
  const nColors = lerp(band.colors, t);
  const gateSlots = (Array.isArray(band.gateSlots) ? band.gateSlots[id % 2]! : band.gateSlots) + extraSlots;

  const specs = Array.from({ length: target }, (_, i) => ({
    id: i + 1,
    color: 0,
    length: rng.pick(band.lengths),
  }));

  const planes: PlaneData[] = layoutPlanes(specs, band.cols, band.rows, rng);
  if (planes.length < Math.ceil(band.planes[0] * MIN_FILL)) return null;
  // colors dealt evenly over the planes that fit, then shuffled
  rng.shuffle(planes.map((_, i) => i % nColors)).forEach((c, i) => (planes[i]!.color = c));

  const seats: number[] = Array(nColors).fill(0);
  for (const p of planes) seats[p.color]! += Game.capacity(p);
  if (seats.some((n) => n === 0)) return null; // every color must appear

  // Start at the target mix and relax it (longer color runs) until the solver can win at this
  // gate count. Low gate counts with a fully interleaved queue are often unwinnable.
  const targetMix = Math.min(0.9, 0.1 + id / 120);
  for (let m = targetMix; m > -0.3; m -= 0.15) {
    const level: LevelData = {
      id,
      seed,
      cols: band.cols,
      rows: band.rows,
      gateSlots,
      planes,
      queue: buildQueue(seats, m, rng),
      queueShape: SHAPES[id % SHAPES.length]!,
      parMinSlots: gateSlots,
    };
    if (solve(Game.create(level)) === 'win') return level;
  }
  return null;
}

/**
 * Deterministic: level `id` always maps to the same level. Seeds are id*1000 + extra*100 + attempt.
 * If the table's gate count cannot be won after ATTEMPTS layouts, one more slot is allowed (up to +3).
 */
export function generateLevel(id: number, withPar = true): LevelData {
  for (let extra = 0; extra <= 3; extra++) {
    for (let a = 0; a < ATTEMPTS; a++) {
      const level = tryLevel(id, id * 1000 + extra * 100 + a, extra);
      if (level) {
        if (withPar) level.parMinSlots = parMinSlots(level) || level.gateSlots;
        return level;
      }
    }
  }
  throw new Error(`could not generate a solvable level ${id}`);
}

/** Throws if a level breaks the seat invariant or the layout rules. */
export function validateLevel(level: LevelData): void {
  const seats = new Map<number, number>();
  for (const p of level.planes) seats.set(p.color, (seats.get(p.color) ?? 0) + Game.capacity(p));
  const pax = new Map<number, number>();
  for (const c of level.queue) pax.set(c, (pax.get(c) ?? 0) + 1);
  for (const c of new Set([...seats.keys(), ...pax.keys()])) {
    if (seats.get(c) !== pax.get(c)) {
      throw new Error(`level ${level.id}: color ${c} has ${pax.get(c) ?? 0} passengers for ${seats.get(c) ?? 0} seats`);
    }
  }
  Game.create(level); // throws if planes overlap or leave the grid
}

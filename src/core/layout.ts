import { Board } from './Board.ts';
import type { Rng } from './rng.ts';
import type { Dir, PlaneData } from './types.ts';

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/**
 * Reverse construction: each new plane's exit path crosses no plane already placed, so the
 * last plane placed is the first that can be tapped and the apron can always be cleared.
 * Places `specs` in order (a plane may come out shorter than requested if it does not fit) and stops at the first plane that will not fit (returns the ones placed).
 */
export function layoutPlanes(
  specs: readonly Pick<PlaneData, 'id' | 'color' | 'length'>[],
  cols: number,
  rows: number,
  rng: Rng,
  tries = 300,
): PlaneData[] {
  const board = new Board(cols, rows);
  const out: PlaneData[] = [];
  for (const s of specs) {
    let placed: PlaneData | null = null;
    // try the requested length first, then shorter ones to fill gaps
    for (let len = s.length; len >= 2 && !placed; len--) {
      for (let t = 0; t < tries && !placed; t++) {
        const p: PlaneData = { ...s, length: len as 2 | 3 | 4, x: rng.int(cols), y: rng.int(rows), dir: rng.pick(DIRS) };
        if (board.canPlace(p) && board.pathClear(p)) placed = p;
      }
    }
    if (!placed) break;
    board.add(placed);
    out.push(placed);
  }
  return out;
}

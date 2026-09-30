import { Game } from './Game.ts';
import { layoutPlanes } from './layout.ts';
import type { Rng } from './rng.ts';
import type { LevelData } from './types.ts';

export type SolveResult = 'win' | 'lose' | 'cap';
export const NODE_CAP = 200_000;

const keyOf = (g: Game) =>
  `${g.board.ids().sort((a, b) => a - b).join()}|${g.gate.map((p) => (p === null ? '-' : `${p}:${g.filled.get(p)}`)).join()}|${g.queueIdx}`;

/**
 * Moves worth trying. Parking a plane that cannot help the queue head only burns a gate slot and can
 * be postponed, so: if a movable plane has the head color, try only those; otherwise try only the
 * movable planes that (transitively) block a head-color plane.
 */
function candidates(g: Game): number[] {
  const head = g.head;
  const ids = g.board.ids();
  const movable = ids.filter((id) => g.board.canTaxi(id));
  const want = ids.filter((id) => g.planeInfo(id).color === head);
  const direct = movable.filter((id) => g.planeInfo(id).color === head);
  if (direct.length || !want.length) return direct.length ? direct : movable;
  const relevant = new Set<number>();
  const stack = [...want];
  while (stack.length) {
    for (const b of g.board.blockers(stack.pop()!)) if (!relevant.has(b)) (relevant.add(b), stack.push(b));
  }
  return movable.filter((id) => relevant.has(id));
}

/** A plane worth tapping next (used by the tutorial hand). */
export const hintPlane = (g: Game): number | undefined => candidates(g)[0];

/** Depth-first search over the real `Game` rules, memoized, capped at `cap` expanded nodes. */
export function solve(start: Game, cap = NODE_CAP): SolveResult {
  const seen = new Set<string>();
  let nodes = 0;
  let capped = false;

  const dfs = (g: Game): boolean => {
    if (g.status === 'won') return true;
    if (g.status === 'failed') return false;
    const k = keyOf(g);
    if (seen.has(k)) return false;
    seen.add(k);
    if (++nodes > cap) {
      capped = true;
      return false;
    }
    const moves = candidates(g);
    for (const id of moves) {
      const next = g.clone();
      next.tap(id);
      if (dfs(next)) return true;
      if (capped) return false;
    }
    return false;
  };

  if (dfs(start)) return 'win';
  return capped ? 'cap' : 'lose';
}

/** Fewest gate slots (1..level.gateSlots) that still allow a win, or 0 if not even the full count wins. */
export function parMinSlots(level: LevelData, cap = NODE_CAP): number {
  if (solve(Game.create(level), cap) !== 'win') return 0;
  let par = level.gateSlots;
  while (par > 1 && solve(Game.create({ ...level, gateSlots: par - 1 }), cap) === 'win') par--;
  return par;
}

/**
 * Shuffle Board booster: new random layout of the planes still on the apron. Only ever applies a layout
 * the solver can win from the current gate/queue state; returns false (board untouched) if none is found.
 */
export function shuffleBoard(game: Game, rng: Rng, attempts = 40): boolean {
  const specs = game.board.list().map(({ id, color, length }) => ({ id, color, length }));
  if (specs.length < 2) return false;
  for (let i = 0; i < attempts; i++) {
    // try longest planes first; retry until every plane fits AND the solver can still win from here
    const layout = layoutPlanes([...specs].sort((a, b) => b.length - a.length), game.level.cols, game.level.rows, rng);
    if (layout.length !== specs.length) continue;
    const probe = game.clone();
    probe.relayout(layout);
    if (solve(probe, 50_000) === 'win') {
      game.relayout(layout);
      return true;
    }
  }
  return false; // board left untouched
}

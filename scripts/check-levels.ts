// Dev validator for level data. Run: npm run check:levels [firstId lastId]
// Checks overlaps, bounds, seat invariant, solvability and touch-target size for shipped levels
// (default 1..100), or for a range of generated levels (e.g. `npm run check:levels 101 130`).
import shipped from '../src/data/levels.json' with { type: 'json' };
import { checkLevel } from '../src/core/devChecks.ts';
import { generateLevel } from '../src/core/Generator.ts';
import type { LevelData } from '../src/core/types.ts';

const from = Number(process.argv[2] ?? 1);
const to = Number(process.argv[3] ?? (shipped as LevelData[]).length);
let bad = 0;
let warned = 0;
for (let id = from; id <= to; id++) {
  const level = id <= (shipped as LevelData[]).length ? (shipped as LevelData[])[id - 1]! : generateLevel(id, false);
  const r = checkLevel(level);
  if (r.errors.length) {
    bad++;
    console.log(`level ${id}: ERROR`, r.errors.join('; '));
  }
  if (r.warnings.length) warned++;
}
console.log(`checked levels ${from}..${to}: ${bad} with errors, ${warned} with touch-target warnings (taps snap to the nearest plane there)`);
process.exit(bad ? 1 : 0);

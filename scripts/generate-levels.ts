// Writes src/data/levels.json (levels 1..COUNT). Run with: npm run gen:levels
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateLevel } from '../src/core/Generator.ts';

const COUNT = 100;
const levels = [];
for (let id = 1; id <= COUNT; id++) {
  const t = Date.now();
  const level = generateLevel(id);
  levels.push(level);
  console.log(`level ${id}: ${level.planes.length} planes, ${level.queue.length} passengers, gates ${level.gateSlots} (par ${level.parMinSlots}), ${Date.now() - t} ms`);
}
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/levels.json', JSON.stringify(levels));
console.log(`wrote ${levels.length} levels`);

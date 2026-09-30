import { Game } from '../src/core/Game.ts';
import { generateLevel } from '../src/core/Generator.ts';
const ids = process.argv.slice(2).map(Number);
for (const id of ids) {
  const t = Date.now();
  try {
    const l = generateLevel(id, false);
    console.log(id, 'planes', l.planes.length, 'pax', l.queue.length, 'seed', l.seed, Date.now() - t, 'ms');
  } catch (e) { console.log(id, 'FAIL', (e as Error).message, Date.now() - t, 'ms'); }
}
void Game;

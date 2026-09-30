import type { LevelData } from '../core/types.ts';
import shipped from './levels.json';

export const SHIPPED_LEVELS = (shipped as LevelData[]).length;

let worker: Worker | undefined;
const cache = new Map<number, LevelData>();

/**
 * Levels 1..100 ship in levels.json. Later levels are generated from their number, in a worker
 * so the solver can never freeze the UI (a hard level can take several seconds).
 */
export function loadLevel(n: number): Promise<LevelData> {
  if (n <= SHIPPED_LEVELS) return Promise.resolve((shipped as LevelData[])[n - 1]!);
  const hit = cache.get(n);
  if (hit) return Promise.resolve(hit);
  worker ??= new Worker(new URL('./levelWorker.ts', import.meta.url), { type: 'module' });
  const w = worker;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent<{ level?: LevelData; id: number; error?: string }>) => {
      if (e.data.id !== n) return;
      w.removeEventListener('message', onMsg);
      if (e.data.level) {
        cache.set(n, e.data.level);
        resolve(e.data.level);
      } else reject(new Error(e.data.error));
    };
    w.addEventListener('message', onMsg);
    w.postMessage(n);
  });
}

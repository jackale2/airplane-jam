import type { LevelData } from '../core/types.ts';
import shipped from './levels.json';

export const SHIPPED_LEVELS = (shipped as LevelData[]).length;

let worker: Worker | undefined;
const cache = new Map<string, LevelData>();
const inflight = new Map<string, Promise<LevelData>>();

/** Generate in a worker so the solver can never freeze the UI (a hard level can take seconds). */
function fromWorker(tag: string, msg: object): Promise<LevelData> {
  const hit = cache.get(tag);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(tag);
  if (running) return running;
  worker ??= new Worker(new URL('./levelWorker.ts', import.meta.url), { type: 'module' });
  const w = worker;
  const p = new Promise<LevelData>((resolve, reject) => {
    const onMsg = (e: MessageEvent<{ tag: string; level?: LevelData; error?: string }>) => {
      if (e.data.tag !== tag) return;
      w.removeEventListener('message', onMsg);
      inflight.delete(tag);
      if (e.data.level) {
        cache.set(tag, e.data.level);
        resolve(e.data.level);
      } else reject(new Error(e.data.error));
    };
    w.addEventListener('message', onMsg);
    w.postMessage(msg);
  });
  inflight.set(tag, p);
  return p;
}

/** Levels 1..100 ship in levels.json; later levels are generated from their number. */
export function loadLevel(n: number): Promise<LevelData> {
  if (n <= SHIPPED_LEVELS) return Promise.resolve((shipped as LevelData[])[n - 1]!);
  return fromWorker(`level:${n}`, { kind: 'level', id: n });
}

/** A calm Zen board for a seed. */
export function loadZenLevel(seed: number): Promise<LevelData> {
  return fromWorker(`zen:${seed}`, { kind: 'zen', seed });
}

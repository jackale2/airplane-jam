import { generateLevel } from '../core/Generator.ts';

self.onmessage = (e: MessageEvent<number>) => {
  const id = e.data;
  try {
    self.postMessage({ id, level: generateLevel(id) });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};

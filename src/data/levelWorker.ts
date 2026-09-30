import { generateLevel, generateZenLevel } from '../core/Generator.ts';

type Req = { kind: 'level'; id: number } | { kind: 'zen'; seed: number };

self.onmessage = (e: MessageEvent<Req>) => {
  const r = e.data;
  const tag = r.kind === 'level' ? `level:${r.id}` : `zen:${r.seed}`;
  try {
    self.postMessage({ tag, level: r.kind === 'level' ? generateLevel(r.id) : generateZenLevel(r.seed) });
  } catch (err) {
    self.postMessage({ tag, error: String(err) });
  }
};

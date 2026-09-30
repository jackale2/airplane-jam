/** mulberry32: small seeded PRNG, deterministic across platforms. */
export interface Rng {
  next(): number; // [0, 1)
  int(n: number): number; // [0, n)
  pick<T>(a: readonly T[]): T;
  shuffle<T>(a: T[]): T[];
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number) => Math.floor(next() * n);
  return {
    next,
    int,
    pick: (a) => a[int(a.length)]!,
    shuffle: (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    },
  };
}

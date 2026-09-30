/** Local calendar day as YYYY-MM-DD (the player's own midnight rolls the day). */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days from `a` to `b` (both YYYY-MM-DD); NaN if either is malformed. */
export function daysBetween(a: string, b: string) {
  const p = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return m ? Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!) : NaN;
  };
  return Math.round((p(b) - p(a)) / 86_400_000);
}

/** Small stable hash for seeding per-day content. */
export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Color helpers for the art generators. Hex strings without '#'. */
const rgb = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

/** t < 0 darkens toward black, t > 0 lightens toward white. Returns '#rrggbb'. */
export function shade(hex: string, t: number) {
  return toHex(rgb(hex).map((v) => (t < 0 ? v * (1 + t) : v + (255 - v) * t)));
}

/** Darken with a hue-preserving deep tone (less muddy than plain black mixing for yellows). */
export function deep(hex: string, t: number) {
  const [r, g, b] = rgb(hex);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // bright colors need more darkening to get a readable outline
  const k = t * (lum > 170 ? 1.15 : 1);
  return toHex([r, g, b].map((v) => v * (1 + k) - (lum > 170 ? 12 : 0)));
}

export const PALETTE = ['E53935', 'FB8C00', 'FDD835', '43A047', '00ACC1', '1E88E5', '8E24AA', 'EC407A'];

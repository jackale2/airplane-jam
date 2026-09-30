// Writes 24 top-down plane SVGs (3 lengths x 8 colors) to public/assets/planes. Run: npm run gen:planes
// Look: the whole fuselage is the game color (readable on dense boards), wings and tail a darker shade,
// white cockpit and belly stripe. The direction arrow and color symbol are drawn on top in code.
import { mkdirSync, writeFileSync } from 'node:fs';

const COLORS = ['E53935', 'FB8C00', 'FDD835', '43A047', '00ACC1', '1E88E5', '8E24AA', 'EC407A'];
const INK = '#1B2340';

function shade(hex: string, t: number) {
  // t < 0 darkens toward black, t > 0 lightens toward white
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return '#' + c.map((v) => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Top-down, nose up. viewBox is 100 wide and 100 x length tall. Everything stays inside the box. */
function plane(length: 2 | 3 | 4, hex: string) {
  const H = 100 * length;
  const body = `#${hex}`;
  const wingC = shade(hex, -0.25);
  const line = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
  const wy = Math.round(H * (length === 2 ? 0.36 : 0.34));
  const sweep = length === 2 ? 34 : length === 3 ? 44 : 54;
  const root = length === 2 ? 40 : length === 3 ? 50 : 60;
  const wing = (s: 1 | -1) => {
    const x = (dx: number) => 50 + s * dx;
    return `<polygon points="${x(20)},${wy} ${x(45)},${wy + sweep} ${x(45)},${wy + sweep + 18} ${x(20)},${wy + root}" fill="${wingC}" ${line}/>`;
  };
  const ty = H - 46;
  const tail = (s: 1 | -1) => `<polygon points="${50 + s * 20},${ty} ${50 + s * 38},${ty + 18} ${50 + s * 38},${ty + 30} ${50 + s * 20},${ty + 28}" fill="${wingC}" ${line}/>`;
  const engineXs = length === 2 ? [] : length === 3 ? [28, 72] : [15, 30, 70, 85];
  const engines = engineXs
    .map((ex) => `<rect x="${ex - 6}" y="${wy + 24 + (Math.abs(ex - 50) < 30 ? 0 : 14)}" width="12" height="28" rx="6" fill="#EEF2FA" stroke="${INK}" stroke-width="3.5"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${H}" width="100" height="${H}">
${wing(1)}${wing(-1)}${tail(1)}${tail(-1)}${engines}
<rect x="29" y="5" width="42" height="${H - 10}" rx="21" fill="${body}" ${line}/>
<rect x="34" y="14" width="10" height="${H - 34}" rx="5" fill="#FFFFFF" opacity="0.35"/>
<rect x="38" y="16" width="24" height="12" rx="6" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/>
</svg>
`;
}

mkdirSync('public/assets/planes', { recursive: true });
for (const length of [2, 3, 4] as const) {
  COLORS.forEach((hex, color) => writeFileSync(`public/assets/planes/plane_${length}_${color}.svg`, plane(length, hex)));
}
console.log('wrote 24 plane SVGs');

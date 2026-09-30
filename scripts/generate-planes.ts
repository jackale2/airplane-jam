// Writes 24 top-down plane SVGs (3 lengths x 8 colors) to public/assets/planes. Run: npm run gen:planes
import { mkdirSync, writeFileSync } from 'node:fs';

const COLORS = ['E53935', 'FB8C00', 'FDD835', '43A047', '00ACC1', '1E88E5', '8E24AA', 'EC407A'];
const OUTLINE = '#1B2340';

/** Mix a hex color toward white by `t` (0..1). */
function lighten(hex: string, t: number) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return '#' + c.map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Top-down, nose up. viewBox is 100 wide and 100 x length tall. */
function plane(length: 2 | 3 | 4, hex: string) {
  const H = 100 * length;
  const body = `#${hex}`;
  const light = lighten(hex, 0.45);
  const stroke = `stroke="${OUTLINE}" stroke-width="6" stroke-linejoin="round"`;
  const wingY = Math.round(H * (length === 2 ? 0.42 : 0.4)); // wing root, front edge
  const chord = length === 2 ? 34 : length === 3 ? 40 : 46;
  const sweep = length === 2 ? 22 : length === 3 ? 30 : 38;
  const tipX = length === 2 ? 10 : 8;
  const wing = (s: 1 | -1) => {
    const x = (dx: number) => 50 + s * dx;
    return `<polygon points="${x(16)},${wingY} ${x(50 - tipX)},${wingY + sweep} ${x(50 - tipX)},${wingY + sweep + 14} ${x(16)},${wingY + chord}" fill="${light}" ${stroke}/>`;
  };
  const tailY = H - 34;
  const tail = (s: 1 | -1) => `<polygon points="${50 + s * 16},${tailY} ${50 + s * 34},${tailY + 14} ${50 + s * 34},${tailY + 24} ${50 + s * 16},${tailY + 22}" fill="${light}" ${stroke}/>`;
  const engineXs = length === 2 ? [] : length === 3 ? [24, 76] : [14, 27, 73, 86];
  const engines = engineXs
    .map((ex, i) => {
      const inner = Math.abs(ex - 50) < 30; // inner engines sit further back along the swept wing
      const ey = wingY + (inner ? 6 : 18) + (length === 3 ? 6 : 0);
      return `<rect x="${ex - 6}" y="${ey}" width="12" height="26" rx="6" fill="#8A93A8" ${stroke.replace('6', '4')}/>`;
    })
    .join('');
  const windows: string[] = [];
  for (let y = 62; y < H - 46; y += 17) {
    windows.push(`<circle cx="43" cy="${y}" r="3.2" fill="#DFF3FF"/><circle cx="57" cy="${y}" r="3.2" fill="#DFF3FF"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${H}" width="100" height="${H}">
${wing(1)}${wing(-1)}${tail(1)}${tail(-1)}${engines}
<rect x="32" y="5" width="36" height="${H - 10}" rx="18" fill="${body}" ${stroke}/>
<rect x="40" y="30" width="7" height="${H - 64}" rx="3.5" fill="${light}" opacity="0.7"/>
<ellipse cx="50" cy="28" rx="10" ry="12" fill="#FFFFFF" stroke="${OUTLINE}" stroke-width="3"/>
${windows.join('')}
</svg>
`;
}

mkdirSync('public/assets/planes', { recursive: true });
for (const length of [2, 3, 4] as const) {
  COLORS.forEach((hex, color) => writeFileSync(`public/assets/planes/plane_${length}_${color}.svg`, plane(length, hex)));
}
console.log('wrote 24 plane SVGs');

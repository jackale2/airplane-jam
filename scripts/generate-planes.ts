// Writes 24 top-down plane SVGs (3 lengths x 8 colors) to public/assets/planes. Run: npm run gen:planes
// Look: white airliner with a colored nose cap, wings and tail (the color is the game color).
import { mkdirSync, writeFileSync } from 'node:fs';

const COLORS = ['E53935', 'FB8C00', 'FDD835', '43A047', '00ACC1', '1E88E5', '8E24AA', 'EC407A'];
const INK = '#1B2340';

/** Top-down, nose up. viewBox is 100 wide and 100 x length tall. */
function plane(length: 2 | 3 | 4, hex: string) {
  const H = 100 * length;
  const c = `#${hex}`;
  const line = `stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"`;
  const wy = Math.round(H * (length === 2 ? 0.36 : 0.34)); // wing root, front edge
  const sweep = length === 2 ? 36 : length === 3 ? 46 : 56;
  const root = length === 2 ? 40 : length === 3 ? 50 : 60;
  const tipX = 5;
  const wing = (s: 1 | -1) => {
    const x = (dx: number) => 50 + s * dx;
    return `<polygon points="${x(19)},${wy} ${x(50 - tipX)},${wy + sweep} ${x(50 - tipX)},${wy + sweep + 18} ${x(19)},${wy + root}" fill="${c}" ${line}/>`;
  };
  const ty = H - 44;
  const tail = (s: 1 | -1) => `<polygon points="${50 + s * 18},${ty} ${50 + s * 36},${ty + 18} ${50 + s * 36},${ty + 30} ${50 + s * 18},${ty + 28}" fill="${c}" ${line}/>`;
  const engineXs = length === 2 ? [] : length === 3 ? [27, 73] : [14, 29, 71, 86];
  const engines = engineXs
    .map((ex) => `<rect x="${ex - 6}" y="${wy + 22 + (Math.abs(ex - 50) < 30 ? 0 : 14)}" width="12" height="28" rx="6" fill="#EEF2FA" stroke="${INK}" stroke-width="3.5"/>`)
    .join('');
  const windows: string[] = [];
  for (let y = 66; y < H - 50; y += 16) windows.push(`<circle cx="41" cy="${y}" r="3" fill="#6B86B3"/><circle cx="59" cy="${y}" r="3" fill="#6B86B3"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${H}" width="100" height="${H}">
${wing(1)}${wing(-1)}${tail(1)}${tail(-1)}${engines}
<rect x="30" y="5" width="40" height="${H - 10}" rx="20" fill="#FFFFFF"/>
<path d="M30 28 A20 20 0 0 1 70 28 Z" fill="${c}"/>
<rect x="58" y="34" width="8" height="${H - 76}" rx="4" fill="#D9E1F0"/>
<rect x="30" y="5" width="40" height="${H - 10}" rx="20" fill="none" ${line}/>
<rect x="38" y="30" width="24" height="13" rx="6.5" fill="#2F6DB5" stroke="${INK}" stroke-width="3"/>
<rect x="42" y="33" width="9" height="3.5" rx="1.75" fill="#FFFFFF" opacity="0.8"/>
<rect x="30" y="${H - 46}" width="40" height="10" fill="${c}" opacity="0.9"/>
<rect x="30" y="5" width="40" height="${H - 10}" rx="20" fill="none" ${line}/>
${windows.join('')}
</svg>
`;
}

mkdirSync('public/assets/planes', { recursive: true });
for (const length of [2, 3, 4] as const) {
  COLORS.forEach((hex, color) => writeFileSync(`public/assets/planes/plane_${length}_${color}.svg`, plane(length, hex)));
}
console.log('wrote 24 plane SVGs');

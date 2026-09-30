// Top-down toy airliners, nose up. viewBox is 100 wide and 100 x length tall; everything stays inside it,
// so a plane fits its cells exactly. The fuselage is the game color (read at a glance on dense boards),
// shaded like a glossy cylinder, with a same-hue dark outline instead of black ink.
import { deep, shade } from './color.ts';

export type Livery = 'classic' | 'racer' | 'polka' | 'prop' | 'jumbo';
export const LIVERY_IDS: Livery[] = ['classic', 'racer', 'polka', 'prop', 'jumbo'];

const ENGINE_INK = '#4A5268';

function engine(x: number, y: number, w: number, h: number) {
  return (
    `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="url(#eng)" stroke="${ENGINE_INK}" stroke-width="2"/>` +
    `<ellipse cx="${x}" cy="${y + 3.2}" rx="${w / 2 - 1.8}" ry="2.2" fill="#39415A"/>`
  );
}

function propDisc(x: number, y: number, r: number) {
  return (
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.18}" fill="#D6DEEA" opacity="0.55"/>` +
    `<rect x="${x - r * 0.9}" y="${y - 1.2}" width="${r * 1.8}" height="2.4" rx="1.2" fill="#5B6478" opacity="0.8"/>` +
    `<circle cx="${x}" cy="${y}" r="${Math.max(2.6, r * 0.22)}" fill="#EEF2F8" stroke="${ENGINE_INK}" stroke-width="1.6"/>`
  );
}

function star(cx: number, cy: number, r: number, fill: string) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}"/>`;
}

export function planeSvg(livery: Livery, L: 2 | 3 | 4, hex: string) {
  const H = 100 * L;
  const ink = deep(hex, -0.55);
  const base = `#${hex}`;
  const prop = livery === 'prop';
  const jumbo = livery === 'jumbo';
  const line = `stroke="${ink}" stroke-width="3" stroke-linejoin="round"`;

  // fuselage sides and wing geometry
  const fx0 = 34;
  const fx1 = 66;
  const wy = Math.round(H * (L === 2 ? 0.36 : L === 3 ? 0.35 : 0.33));
  const root = (L === 2 ? 42 : L === 3 ? 54 : 66) + (jumbo ? 6 : 0);
  const sweep = prop ? 5 : (L === 2 ? 26 : L === 3 ? 38 : 50) + (jumbo ? 6 : 0);
  const tipC = prop ? root - 12 : L === 2 ? 15 : 17;
  const tipX = 5;
  const leY = (x: number) => wy + ((fx0 - x) / (fx0 - tipX)) * sweep; // leading edge y at x (left wing)
  const ty = H - 42; // tailplane root

  const wing = (s: 1 | -1) => {
    const X = (x: number) => (s === 1 ? x : 100 - x);
    return `<path d="M${X(fx0 + 1)},${wy} L${X(tipX + 3)},${wy + sweep - 1} Q${X(tipX)},${wy + sweep} ${X(tipX)},${wy + sweep + 4} L${X(tipX)},${wy + sweep + tipC - 3} Q${X(tipX)},${wy + sweep + tipC} ${X(tipX + 3)},${wy + sweep + tipC} L${X(fx0 + 1)},${wy + root} Z" fill="url(#wing)" ${line}/>`;
  };
  const tailplane = (s: 1 | -1) => {
    const X = (x: number) => (s === 1 ? x : 100 - x);
    const tw = prop ? 4 : 16;
    return `<path d="M${X(fx0 + 2)},${ty} L${X(17)},${ty + tw} Q${X(15)},${ty + tw + 1} ${X(15)},${ty + tw + 4} L${X(15)},${ty + tw + 9} L${X(fx0 + 2)},${ty + 24} Z" fill="url(#wing)" ${line}/>`;
  };

  // engines: under the wings, the intake peeking out ahead of the leading edge
  let engines = '';
  if (prop) {
    if (L >= 3) for (const x of L === 3 ? [20, 80] : [14, 26, 74, 86]) engines += `<rect x="${x - 5}" y="${leY(x < 50 ? x : 100 - x) - 8}" width="10" height="26" rx="5" fill="url(#eng)" stroke="${ENGINE_INK}" stroke-width="2"/>`;
  } else if (L === 2 && !jumbo) {
    // regional jet: two engines on the rear fuselage
    engines += engine(28, H - 74, 11, 28) + engine(72, H - 74, 11, 28);
  } else {
    const xs = L === 2 ? [20, 80] : L === 3 && !jumbo ? [20, 80] : [14, 29, 71, 86];
    for (const x of xs) engines += engine(x, leY(x < 50 ? x : 100 - x) - 13, 11, 30);
  }
  let props = '';
  if (prop) {
    props += propDisc(50, 5, 30);
    if (L >= 3) for (const x of L === 3 ? [20, 80] : [14, 26, 74, 86]) props += propDisc(x, leY(x < 50 ? x : 100 - x) - 9, 11);
  }

  const noseY = prop ? 9 : 3;
  const fuselage = `M50,${noseY} C${prop ? 62 : 60},${noseY} 67,${noseY + 10} 67,${noseY + 24} L67,${H - 46} C67,${H - 25} 58,${H - 9} 54,${H - 6} Q50,${H - 4} 46,${H - 6} C42,${H - 9} 33,${H - 25} 33,${H - 46} L33,${noseY + 24} C33,${noseY + 10} ${prop ? 38 : 40},${noseY} 50,${noseY} Z`;

  // passenger windows along both sides
  let windows = '';
  const wTop = noseY + 32;
  const wBot = ty - 8;
  for (let y = wTop; y <= wBot; y += 12) {
    if (jumbo && y < H * 0.3) continue;
    windows += `<circle cx="38.8" cy="${y}" r="2" fill="#E4F6FF" stroke="${ink}" stroke-width="1.1"/><circle cx="61.2" cy="${y}" r="2" fill="#E4F6FF" stroke="${ink}" stroke-width="1.1"/>`;
  }

  let deco = '';
  if (livery === 'racer') {
    deco += `<rect x="46" y="${noseY + 30}" width="8" height="${H - noseY - 62}" rx="4" fill="#FFFFFF" opacity="0.95"/>`;
    deco += `<path d="M${tipX},${wy + sweep + 4} L${tipX + 10},${wy + sweep + 3} L${tipX + 10},${wy + sweep + tipC} L${tipX + 3},${wy + sweep + tipC} Q${tipX},${wy + sweep + tipC} ${tipX},${wy + sweep + tipC - 3} Z" fill="#FFFFFF"/>`;
    deco += `<path d="M${100 - tipX},${wy + sweep + 4} L${90 - tipX},${wy + sweep + 3} L${90 - tipX},${wy + sweep + tipC} L${97 - tipX},${wy + sweep + tipC} Q${100 - tipX},${wy + sweep + tipC} ${100 - tipX},${wy + sweep + tipC - 3} Z" fill="#FFFFFF"/>`;
  }
  if (livery === 'polka') {
    const dots: [number, number][] = [];
    for (let y = noseY + 36, i = 0; y < H - 40; y += 17, i++) dots.push([i % 2 ? 42 : 58, y]);
    deco += dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#FFFFFF" opacity="0.92"/>`).join('');
    deco += `<circle cx="18" cy="${wy + sweep * 0.6 + 8}" r="3.2" fill="#FFFFFF" opacity="0.9"/><circle cx="82" cy="${wy + sweep * 0.6 + 8}" r="3.2" fill="#FFFFFF" opacity="0.9"/>`;
  }
  if (jumbo) {
    const hy = noseY + 14;
    const hh = H * 0.2;
    deco += `<rect x="40" y="${hy}" width="20" height="${hh}" rx="10" fill="url(#hump)" stroke="${ink}" stroke-width="2"/>`;
    for (let y = hy + 12; y < hy + hh - 6; y += 8) deco += `<circle cx="45" cy="${y}" r="1.8" fill="#E4F6FF"/><circle cx="55" cy="${y}" r="1.8" fill="#E4F6FF"/>`;
  }

  const fin = `<rect x="46.5" y="${ty - 16}" width="7" height="${H - ty + 8}" rx="3.5" fill="${shade(hex, -0.28)}" stroke="${ink}" stroke-width="2"/>`;
  const finStar = livery === 'polka' ? star(50, ty + 2, 7, '#FFFFFF') : '';
  const cockpit = `<path d="M39,${noseY + 17} Q50,${noseY + 9} 61,${noseY + 17} L59.5,${noseY + 25} Q50,${noseY + 20} 40.5,${noseY + 25} Z" fill="#2A3D6E" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/><path d="M42,${noseY + 17.5} Q46,${noseY + 14.5} 50,${noseY + 14}" stroke="#FFFFFF" stroke-width="1.8" fill="none" opacity="0.8" stroke-linecap="round"/>`;
  const gloss = `<rect x="37" y="${noseY + 12}" width="7" height="${H - noseY - 58}" rx="3.5" fill="#FFFFFF" opacity="0.3"/><ellipse cx="44" cy="${noseY + 8}" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.55"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${H}" width="100" height="${H}">
<defs>
<linearGradient id="body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(hex, -0.2)}"/><stop offset="0.3" stop-color="${shade(hex, 0.3)}"/><stop offset="0.55" stop-color="${base}"/><stop offset="1" stop-color="${shade(hex, -0.3)}"/></linearGradient>
<linearGradient id="wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hex, 0.18)}"/><stop offset="1" stop-color="${shade(hex, -0.24)}"/></linearGradient>
<linearGradient id="hump" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(hex, 0.1)}"/><stop offset="0.35" stop-color="${shade(hex, 0.42)}"/><stop offset="1" stop-color="${shade(hex, -0.12)}"/></linearGradient>
<linearGradient id="eng" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C9D1DE"/><stop offset="0.4" stop-color="#FFFFFF"/><stop offset="1" stop-color="#AEB8C8"/></linearGradient>
</defs>
${tailplane(1)}${tailplane(-1)}${engines}${wing(1)}${wing(-1)}
<path d="${fuselage}" fill="url(#body)" ${line}/>
${gloss}${windows}${deco}${fin}${finStar}${cockpit}${props}
</svg>
`;
}

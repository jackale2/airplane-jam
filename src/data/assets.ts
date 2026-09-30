/** Manifest of everything under public/assets (paths are relative to the site root). */
const A = 'assets';

export const IMAGES = {
  hand: `${A}/ui/icons/tap.png`,
  coin: `${A}/ui/icons/coin.png`,
  puff: `${A}/ui/fx/puffSmall.png`,
  sparkStar: `${A}/ui/fx/particleWhite_3.png`,
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`symbol${i}`, `${A}/ui/symbols/symbol_${i}.png`])),
} as Record<string, string>;

export const SOUNDS = {
  click: `${A}/audio/sfx/click.wav`,
  popup: `${A}/audio/sfx/popup.wav`,
  coin: `${A}/audio/sfx/coin.wav`,
  tick: `${A}/audio/sfx/tick.wav`,
} as const;

/** Optional: put a file at this path to get music. Missing file means no music. */
export const MUSIC = `${A}/audio/music/music.ogg`;

export const FONTS = {
  main: { family: 'Fredoka', url: `${A}/fonts/Fredoka.ttf` }, // variable weight, SIL OFL
} as const;

export const planeKey = (length: number, color: number) => `plane_${length}_${color}`;
export const planePath = (length: number, color: number) => `${A}/planes/plane_${length}_${color}.svg`;

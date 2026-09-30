/** Manifest of everything under public/assets (paths are relative to the site root). */
const A = 'assets';

export const IMAGES = {
  hand: `${A}/ui/icons/tap.png`,
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`symbol${i}`, `${A}/ui/symbols/symbol_${i}.png`])),
} as Record<string, string>;

/** Optional: put a file at this path and it replaces the generated music. */
export const MUSIC = `${A}/audio/music/music.ogg`;

export const FONTS = {
  main: { family: 'Fredoka', url: `${A}/fonts/Fredoka.ttf` }, // variable weight, SIL OFL
} as const;

/** Planes: one folder per livery (cosmetic), 3 lengths x 8 colors. */
export const planeKey = (livery: string, length: number, color: number) => `plane_${livery}_${length}_${color}`;
export const planePath = (livery: string, length: number, color: number) => `${A}/planes/${livery}/plane_${length}_${color}.svg`;
export const planeShadowKey = (livery: string, length: number) => `planesh_${livery}_${length}`;

/** Travelers: 8 characters x 8 colors, plus outfit overlays (cosmetics). */
export const TRAVELERS = 8;
export const travelerKey = (ch: number, color: number) => `trav_${ch}_${color}`;
export const travelerPath = (ch: number, color: number) => `${A}/passengers/traveler_${ch}_${color}.svg`;
export const outfitKey = (o: string) => `outfit_${o}`;
export const outfitPath = (o: string) => `${A}/passengers/outfit_${o}.svg`;

/** Pixel size the SVGs are rasterized at, per design px shown (sharp on high-density screens). */
export const PLANE_SVG_SCALE = 1.35;
export const TRAVELER_SVG_SCALE = 1.2;

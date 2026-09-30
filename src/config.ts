/** Design resolution and layout, all in design pixels (portrait 1080 x 1920). */
export const W = 1080;
export const H = 1920;

export const REGION = {
  hud: { y: 0, h: H * 0.08 },
  queue: { y: H * 0.08, h: H * 0.29 },
  gate: { y: H * 0.37, h: H * 0.075 },
  apron: { y: H * 0.445, h: H * 0.435 },
  boosters: { y: H * 0.88, h: H * 0.12 },
} as const;

export const THEME = {
  sky: 0x9fd7ee,
  skyDark: 0x6fb4d8,
  apron: 0x2b2f3a,
  taxiLine: 0xfdd835,
  gateFree: 0x3a4152,
  gateEdge: 0xfdd835,
  ink: 0x1b2340,
  panelText: '#1B2340',
  white: '#FFFFFF',
  gold: '#FDD835',
} as const;

/** Apron cell size for a grid: fills the region with a small margin, capped so small boards are not giant. */
export function cellSize(cols: number, rows: number) {
  const margin = 40;
  return Math.floor(Math.min(150, (W - margin * 2) / cols, (REGION.apron.h - margin) / rows));
}

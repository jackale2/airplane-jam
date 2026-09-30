/** Design space: 1080 wide; the height grows on tall phones (up to 20:9) so nothing letterboxes. */
export const W = 1080;
export const H = Math.round(
  typeof window === 'undefined' || !window.innerWidth ? 1920 : Math.min(2400, Math.max(1920, (W * window.innerHeight) / window.innerWidth)),
);

const HUD_H = 150;
const BOOSTERS_H = 290; // buttons plus captions, with 60+ px of padding under the captions
const QUEUE_H = Math.round(H * 0.27);
const GATE_H = Math.round(H * 0.07);

export const REGION = {
  hud: { y: 0, h: HUD_H },
  queue: { y: HUD_H, h: QUEUE_H },
  gate: { y: HUD_H + QUEUE_H, h: GATE_H },
  apron: { y: HUD_H + QUEUE_H + GATE_H, h: H - BOOSTERS_H - (HUD_H + QUEUE_H + GATE_H) },
  boosters: { y: H - BOOSTERS_H, h: BOOSTERS_H },
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

/** Board frame thickness and side margin (16 px on a 360 px wide phone = 48 design px). */
export const FRAME = 34;
export const SIDE_MARGIN = 48;

/** Cell size that fills the apron region: full width minus margins, or full height, whichever is tighter. */
export function cellSize(cols: number, rows: number) {
  const availW = W - 2 * (SIDE_MARGIN + FRAME);
  const availH = REGION.apron.h - 2 * FRAME - 16;
  return Math.floor(Math.min(170, availW / cols, availH / rows));
}

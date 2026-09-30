/**
 * Design space. The short side of the screen is always 1080 design px and the long side follows the
 * window, so there are no letterbox bars on any phone, tablet or desktop window (within LONG_MAX).
 * No Phaser imports: unit tested in src/tests/layout.test.ts.
 */
export type ViewMode = 'tall' | 'compact' | 'wide';

export interface ViewSize {
  w: number;
  h: number;
  mode: ViewMode;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SHORT = 1080;
export const LONG_MAX = 2520; // 21:9

/**
 * tall: phones in portrait (stacked HUD, queue, gates, board, boosters).
 * compact: tablets in portrait (stacked, boosters in a column beside the board).
 * wide: landscape and square screens (queue and gates on the left, board on the right).
 */
export function viewFor(cssW: number, cssH: number): ViewSize {
  if (!(cssW > 0) || !(cssH > 0)) return { w: SHORT, h: 1920, mode: 'tall' };
  const r = cssH / cssW;
  if (r >= 1) {
    const h = Math.round(Math.min(LONG_MAX, Math.max(SHORT, SHORT * r)));
    const rr = h / SHORT;
    return { w: SHORT, h, mode: rr >= 1.6 ? 'tall' : rr >= 1.25 ? 'compact' : 'wide' };
  }
  const w = Math.round(Math.min(LONG_MAX, Math.max(SHORT, SHORT / r)));
  return { w, h: SHORT, mode: 'wide' };
}

/**
 * Canvas pixels per design px. Phones stay at 1 (1080 design px already match their panels); tablets and
 * desktops render up to 2x so text and art stay sharp on high-density screens. Quarter steps.
 */
export function renderScale(screenCssW: number, screenCssH: number, dpr: number): number {
  const short = Math.min(screenCssW, screenCssH);
  if (!(short > 0) || short < 600) return 1;
  const r = Math.min(2, Math.max(1, (short * (dpr || 1)) / SHORT));
  return Math.round(r * 4) / 4;
}

/** Same layout (within a few percent) means a resize can be absorbed by scaling instead of a re-layout. */
export function sameView(a: ViewSize, b: ViewSize) {
  return a.mode === b.mode && Math.abs(a.w - b.w) / a.w < 0.06 && Math.abs(a.h - b.h) / a.h < 0.06;
}

export interface GameLayout {
  mode: ViewMode;
  hud: Rect;
  queue: Rect;
  gates: Rect;
  board: Rect;
  boosters: Rect;
  boostersVertical: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Regions of the game screen for a view size. */
export function gameLayout(v: ViewSize): GameLayout {
  const { w, h } = v;
  const pad = 24;
  if (v.mode === 'tall') {
    const hud: Rect = { x: 0, y: 0, w, h: 132 };
    const qh = Math.round(clamp(h * 0.235, 390, 560));
    const queue: Rect = { x: pad, y: hud.h, w: w - 2 * pad, h: qh };
    const gh = Math.round(clamp(h * 0.088, 158, 210));
    const gates: Rect = { x: pad, y: queue.y + qh + 8, w: w - 2 * pad, h: gh };
    const bh = 236;
    const boosters: Rect = { x: 0, y: h - bh, w, h: bh };
    const top = gates.y + gh + 10;
    const board: Rect = { x: pad, y: top, w: w - 2 * pad, h: boosters.y - top - 6 };
    return { mode: 'tall', hud, queue, gates, board, boosters, boostersVertical: false };
  }
  if (v.mode === 'compact') {
    const hud: Rect = { x: 0, y: 0, w, h: 124 };
    const qh = Math.round(clamp(h * 0.22, 300, 400));
    const queue: Rect = { x: pad, y: hud.h, w: w - 2 * pad, h: qh };
    const gh = Math.round(clamp(h * 0.1, 140, 180));
    const gates: Rect = { x: pad, y: queue.y + qh + 8, w: w - 2 * pad, h: gh };
    const colW = 210;
    const top = gates.y + gh + 12;
    const boosters: Rect = { x: w - colW - pad, y: top, w: colW, h: h - top - pad };
    const board: Rect = { x: pad, y: top, w: w - colW - 3 * pad, h: h - top - pad };
    return { mode: 'compact', hud, queue, gates, board, boosters, boostersVertical: true };
  }
  // wide: left column holds the queue, the gates and the boosters; the board fills the right
  const hud: Rect = { x: 0, y: 0, w, h: 116 };
  const lw = Math.round(clamp(w * 0.4, 460, 860));
  const left = { x: pad, y: hud.h, w: lw - pad, h: h - hud.h - pad };
  const bh = Math.round(clamp(left.h * 0.24, 190, 240));
  const gh = Math.round(clamp(left.h * 0.19, 140, 200));
  const qh = left.h - bh - gh - 16;
  const queue: Rect = { x: left.x, y: left.y, w: left.w, h: qh };
  const gates: Rect = { x: left.x, y: queue.y + qh + 8, w: left.w, h: gh };
  const boosters: Rect = { x: left.x, y: gates.y + gh + 8, w: left.w, h: bh };
  const board: Rect = { x: lw + pad, y: hud.h + 4, w: w - lw - 2 * pad, h: h - hud.h - 2 * pad };
  return { mode: 'wide', hud, queue, gates, board, boosters, boostersVertical: false };
}

/** Frame drawn round the board, in design px (tray rim plus runway lights). */
export const BOARD_FRAME = 30;
export const MAX_CELL = 150;

export interface BoardFit {
  rot: 0 | 1; // quarter turns clockwise applied to the level grid on screen
  cell: number;
  cols: number; // on screen
  rows: number;
  ox: number; // top-left of the grid on screen
  oy: number;
}

/**
 * Fit a cols x rows grid into the board region. The grid is turned a quarter when that gives clearly
 * bigger cells (a tall grid on a wide screen); gameplay is identical, only the view turns.
 */
export function fitBoard(area: Rect, cols: number, rows: number): BoardFit {
  const aw = area.w - 2 * BOARD_FRAME;
  const ah = area.h - 2 * BOARD_FRAME;
  const size = (c: number, r: number) => Math.floor(Math.min(MAX_CELL, aw / c, ah / r));
  const straight = size(cols, rows);
  const turned = size(rows, cols);
  const rot: 0 | 1 = turned > straight * 1.06 ? 1 : 0;
  const cell = rot ? turned : straight;
  const dc = rot ? rows : cols;
  const dr = rot ? cols : rows;
  return { rot, cell, cols: dc, rows: dr, ox: Math.round(area.x + (area.w - dc * cell) / 2), oy: Math.round(area.y + (area.h - dr * cell) / 2) };
}

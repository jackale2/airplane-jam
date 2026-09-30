import Phaser from 'phaser';
import { view } from '../config.ts';

export const FONT = 'Fredoka, "Trebuchet MS", sans-serif';

/** UI palette. Button colors are [top, bottom, edge]. */
export const UI = {
  ink: 0x243056,
  inkCss: '#243056',
  soft: 0x5a6790,
  softCss: '#5A6790',
  panel: 0xffffff,
  panelTint: 0xf2f6fc,
  line: 0xdfe6f2,
  gold: 0xffc93c,
  goldCss: '#FFC93C',
  red: 0xff5a5f,
  redCss: '#FF5A5F',
  green: 0x2fb152,
  pill: 0x1f3566,
  pillCss: '#1F3566',
} as const;

export const BUTTON_COLORS = {
  green: { top: 0x72e38a, bottom: 0x2db353, edge: 0x1f8540, text: '#FFFFFF', stroke: '#17702F' },
  yellow: { top: 0xffe27a, bottom: 0xffb81c, edge: 0xd4880a, text: '#5A3A00', stroke: '' },
  blue: { top: 0x7cc0ff, bottom: 0x3a82f0, edge: 0x2458b8, text: '#FFFFFF', stroke: '#1D4A9C' },
  red: { top: 0xff9a8f, bottom: 0xf04a4a, edge: 0xb52d33, text: '#FFFFFF', stroke: '#9C2328' },
  purple: { top: 0xcaa6ff, bottom: 0x8e5cf2, edge: 0x6238c4, text: '#FFFFFF', stroke: '#52309F' },
  white: { top: 0xffffff, bottom: 0xe8eef8, edge: 0xb7c3d8, text: '#243056', stroke: '' },
  dark: { top: 0x46557d, bottom: 0x2c3858, edge: 0x1a2240, text: '#FFFFFF', stroke: '' },
} as const;
export type BtnColor = keyof typeof BUTTON_COLORS;

export interface TextOpts {
  color?: string;
  stroke?: string;
  strokeW?: number;
  weight?: 500 | 600 | 700;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  shadow?: boolean;
  lineSpacing?: number;
}

/** All game text goes through here: Fredoka, crisp at the render scale, optional outline and drop shadow. */
export function text(scene: Phaser.Scene, x: number, y: number, str: string, size: number, o: TextOpts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${Math.round(size)}px`,
    fontStyle: String(o.weight ?? 700),
    color: o.color ?? UI.inkCss,
    align: o.align ?? 'center',
    stroke: o.stroke ?? '',
    strokeThickness: o.stroke ? (o.strokeW ?? Math.max(4, size * 0.14)) : 0,
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing ?? 0,
    padding: { x: 4, y: 4 },
  });
  t.setOrigin(0.5).setResolution(view.res);
  if (o.shadow) t.setShadow(0, Math.max(2, size * 0.07), 'rgba(20,30,70,0.35)', 0, true, true);
  return t;
}

/** Shrink a text object until it fits `maxW` design px. */
export function fitText(t: Phaser.GameObjects.Text, maxW: number) {
  if (t.width > maxW) t.setScale(maxW / t.width);
  return t;
}

export const fmt = (n: number) => n.toLocaleString('en-US');

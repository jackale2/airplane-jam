import Phaser from 'phaser';
import { THEME } from '../config.ts';
import { services } from '../systems/services.ts';

export const FONT = 'Fredoka, sans-serif';

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 48, color: string = THEME.panelText) {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5);
}

export const BTN = {
  yellow: { face: 0xffc928, edge: 0xd9971b, text: '#1B2340' },
  green: { face: 0x2ec44f, edge: 0x1a8f35, text: '#FFFFFF' },
  blue: { face: 0x2f73e6, edge: 0x1d4fb0, text: '#FFFFFF' },
} as const;

export type IconKind = 'pause' | 'restart' | 'gate' | 'sort' | 'shuffle';

/** Small vector icons drawn into a Graphics, centered on (0, 0). `s` is the icon size. */
export function drawIcon(g: Phaser.GameObjects.Graphics, kind: IconKind, s: number, color: number) {
  g.fillStyle(color, 1).lineStyle(s * 0.16, color, 1);
  const arrowHead = (x: number, y: number, dx: number, dy: number) => {
    // triangle at (x, y) pointing along (dx, dy)
    const nx = -dy, ny = dx, l = s * 0.3;
    g.fillTriangle(x + dx * l, y + dy * l, x - dx * l * 0.2 + nx * l, y - dy * l * 0.2 + ny * l, x - dx * l * 0.2 - nx * l, y - dy * l * 0.2 - ny * l);
  };
  switch (kind) {
    case 'pause':
      g.fillRoundedRect(-s * 0.36, -s * 0.4, s * 0.26, s * 0.8, 4).fillRoundedRect(s * 0.1, -s * 0.4, s * 0.26, s * 0.8, 4);
      break;
    case 'restart': {
      // circular arrow: three quarters of a circle, clockwise, with a head where it ends
      const r = s * 0.34;
      const a0 = (-40 * Math.PI) / 180, a1 = (250 * Math.PI) / 180;
      g.beginPath().arc(0, 0, r, a0, a1, false).strokePath();
      arrowHead(r * Math.cos(a1), r * Math.sin(a1), -Math.sin(a1), Math.cos(a1));
      break;
    }
    case 'gate':
      g.fillRect(s * 0.28, -s * 0.4, s * 0.16, s * 0.8).lineBetween(s * 0.2, 0, -s * 0.15, 0);
      arrowHead(-s * 0.15, 0, -1, 0);
      break;
    case 'sort':
      g.fillTriangle(0, -s * 0.44, s * 0.36, -s * 0.06, -s * 0.36, -s * 0.06).fillTriangle(0, s * 0.44, s * 0.36, s * 0.06, -s * 0.36, s * 0.06);
      break;
    case 'shuffle':
      g.lineBetween(-s * 0.4, -s * 0.24, s * 0.22, s * 0.24).lineBetween(-s * 0.4, s * 0.24, s * 0.22, -s * 0.24);
      arrowHead(s * 0.22, s * 0.24, 1, 0.5);
      arrowHead(s * 0.22, -s * 0.24, 1, -0.5);
      break;
  }
}

export interface ButtonOpts {
  size?: number; // font size
  color?: keyof typeof BTN;
  icon?: IconKind;
  sound?: boolean;
}

/** Chunky 3D button: face, darker lower edge, dark outline. Big enough to hit with a thumb. */
export class Button extends Phaser.GameObjects.Container {
  readonly text: Phaser.GameObjects.Text;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    const c = BTN[opts.color ?? 'yellow'];
    const r = Math.min(28, h * 0.28);
    const g = scene.add.graphics();
    g.fillStyle(c.edge, 1).fillRoundedRect(-w / 2, -h / 2 + h * 0.08, w, h, r);
    g.fillStyle(c.face, 1).fillRoundedRect(-w / 2, -h / 2, w, h * 0.92, r);
    g.fillStyle(0xffffff, 0.28).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.22, r * 0.6);
    g.lineStyle(5, 0x1b2340, 1).strokeRoundedRect(-w / 2, -h / 2, w, h * 0.92, r);
    this.add(g);
    const iconSize = h * 0.5;
    const hasLabel = text.length > 0;
    if (opts.icon) {
      const ic = scene.add.graphics().setPosition(hasLabel ? -w / 2 + iconSize * 0.75 : 0, -h * 0.04);
      drawIcon(ic, opts.icon, iconSize, c.text === '#FFFFFF' ? 0xffffff : 0x1b2340);
      this.add(ic);
    }
    this.text = scene.add.text(opts.icon && hasLabel ? iconSize * 0.55 : 0, -h * 0.04, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: `${opts.size ?? Math.round(h * 0.42)}px`, color: c.text, align: 'center' }).setOrigin(0.5);
    this.add(this.text);
    this.setSize(w, h).setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      scene.tweens.add({ targets: this, scale: 0.94, duration: 60, yoyo: true });
      if (opts.sound !== false) services().audio.play('click');
      onClick();
    });
    scene.add.existing(this);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.5);
    return this;
  }
}

import Phaser from 'phaser';
import { services } from '../systems/services.ts';
import { canvasTex, css, darken, rr, vgrad, withShadow } from './gfx.ts';
import { icon, type IconName } from './icons.ts';
import { BUTTON_COLORS, text, type BtnColor } from './theme.ts';

const PAD = 16; // room round the button in its texture for the soft shadow

/** Glossy 3D button face (cached per color and size). */
export function buttonTex(scene: Phaser.Scene, color: BtnColor, w: number, h: number, pill = false) {
  const W = Math.round(w);
  const H = Math.round(h);
  const c = BUTTON_COLORS[color];
  return canvasTex(scene, `btn_${color}_${pill ? 'p' : 'r'}_${W}x${H}`, W + PAD * 2, H + PAD * 2, (ctx) => {
    const edge = Math.max(5, Math.round(H * 0.1));
    const r = pill ? H / 2 : Math.min(H * 0.3, 38);
    const x = PAD;
    const y = PAD;
    withShadow(ctx, 'rgba(22,32,72,0.32)', 14, 0, 7, () => {
      ctx.fillStyle = css(c.edge);
      rr(ctx, x, y + edge, W, H - edge, r);
      ctx.fill();
    });
    ctx.fillStyle = css(c.edge);
    rr(ctx, x, y + edge, W, H - edge, r);
    ctx.fill();
    ctx.fillStyle = vgrad(ctx, y, y + H - edge, [[0, c.top], [1, c.bottom]]);
    rr(ctx, x, y, W, H - edge, r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    rr(ctx, x + Math.min(12, W * 0.08), y + 6, W - 2 * Math.min(12, W * 0.08), (H - edge) * 0.36, r * 0.7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2.5;
    rr(ctx, x + 2, y + 2, W - 4, H - edge - 4, Math.max(2, r - 2));
    ctx.stroke();
    ctx.strokeStyle = css(darken(c.edge, 0.3), 0.6);
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, W - 2, H - 2, r);
    ctx.stroke();
  });
}

export interface ButtonOpts {
  text?: string;
  icon?: IconName;
  color?: BtnColor;
  size?: number; // font size
  iconSize?: number;
  pill?: boolean;
  sound?: boolean;
  onClick: () => void;
}

/**
 * Chunky button: presses in on touch, fires on release (so dragging a list never taps it), grows a little
 * under a mouse. At least 88 design px tall for comfortable thumbs.
 */
export class Button extends Phaser.GameObjects.Container {
  readonly bw: number;
  readonly bh: number;
  readonly content: Phaser.GameObjects.Container;
  label?: Phaser.GameObjects.Text;
  private readonly bg: Phaser.GameObjects.Image;
  private enabled = true;
  private badgeObj?: Phaser.GameObjects.Container;
  private downAt?: { x: number; y: number };
  private opts: ButtonOpts;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: ButtonOpts) {
    super(scene, x, y);
    this.bw = w;
    this.bh = h;
    this.opts = opts;
    const color = opts.color ?? 'green';
    this.bg = scene.add.image(0, 0, buttonTex(scene, color, w, h, opts.pill)).setDisplaySize(w + PAD * 2, h + PAD * 2);
    this.content = scene.add.container(0, -Math.max(5, Math.round(h * 0.1)) / 2);
    this.add([this.bg, this.content]);
    this.buildContent();

    this.setSize(w, h).setInteractive({ useHandCursor: true });
    this.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.enabled) return;
      this.downAt = { x: p.x, y: p.y };
      scene.tweens.killTweensOf(this);
      scene.tweens.add({ targets: this, scale: 0.93, duration: 70, ease: 'Quad.Out' });
    });
    this.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.downAt;
      this.downAt = undefined;
      this.release();
      if (!d || !this.enabled) return;
      if (Math.hypot(p.x - d.x, p.y - d.y) > 14 * scene.scale.displayScale.x) return; // it was a drag, not a tap
      if (opts.sound !== false) services().audio.play('click');
      opts.onClick();
    });
    this.on('pointerout', () => {
      this.downAt = undefined;
      this.release(1);
    });
    this.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (this.enabled && !p.wasTouch && !p.isDown) scene.tweens.add({ targets: this, scale: 1.04, duration: 90 });
    });
    scene.add.existing(this);
  }

  private release(to = 1) {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: to, duration: 160, ease: 'Back.Out' });
  }

  private buildContent() {
    const { opts, bh: h, bw: w } = this;
    const c = BUTTON_COLORS[opts.color ?? 'green'];
    this.content.removeAll(true);
    const parts: Phaser.GameObjects.GameObject[] = [];
    let ic: Phaser.GameObjects.Image | undefined;
    if (opts.icon) {
      const s = opts.iconSize ?? Math.round(h * (opts.text ? 0.46 : 0.56));
      ic = icon(this.scene, 0, 0, opts.icon, s, c.text === '#FFFFFF' ? 0xffffff : 0x5a3a00);
      if (opts.color === 'white') ic.setTint(0x243056);
      parts.push(ic);
    }
    if (opts.text) {
      const size = opts.size ?? Math.round(h * 0.38);
      this.label = text(this.scene, 0, 0, opts.text, size, { color: c.text, stroke: c.stroke || undefined, strokeW: c.stroke ? Math.max(4, size * 0.16) : 0 });
      parts.push(this.label);
    } else this.label = undefined;
    this.content.add(parts);
    this.layoutContent(w);
  }

  private layoutContent(w: number) {
    const items = this.content.list as (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[];
    if (items.length === 2) {
      const [ic, t] = items as [Phaser.GameObjects.Image, Phaser.GameObjects.Text];
      const gap = 14;
      const maxT = w - ic.displayWidth - gap - 40;
      if (t.width > maxT) t.setScale(maxT / t.width);
      const total = ic.displayWidth + gap + t.displayWidth;
      ic.x = -total / 2 + ic.displayWidth / 2;
      t.x = ic.x + ic.displayWidth / 2 + gap + t.displayWidth / 2;
    } else if (items.length === 1 && items[0] instanceof Phaser.GameObjects.Text) {
      const t = items[0];
      if (t.width > w - 36) t.setScale((w - 36) / t.width);
    }
  }

  setText(s: string) {
    this.opts = { ...this.opts, text: s };
    this.buildContent();
    return this;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.bg.setTint(on ? 0xffffff : 0xb8bfcc);
    this.content.setAlpha(on ? 1 : 0.7);
    return this;
  }

  get isEnabled() {
    return this.enabled;
  }

  /** Red dot with a count (or just a dot when n is true). 0 or false hides it. */
  setBadge(n: number | boolean) {
    this.badgeObj?.destroy();
    this.badgeObj = undefined;
    if (!n) return this;
    const s = this.scene;
    const r = 22;
    const g = s.add.graphics();
    g.fillStyle(0xb52d33, 1).fillCircle(0, 3, r).fillStyle(0xff4d57, 1).fillCircle(0, 0, r).lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, r);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    if (typeof n === 'number') parts.push(text(s, 0, -1, n > 9 ? '9+' : String(n), 26, { color: '#FFFFFF' }));
    this.badgeObj = s.add.container(this.bw / 2 - 12, -this.bh / 2 + 10, parts);
    this.add(this.badgeObj);
    s.tweens.add({ targets: this.badgeObj, scale: { from: 0.4, to: 1 }, duration: 260, ease: 'Back.Out' });
    return this;
  }
}

import Phaser from 'phaser';
import { view } from '../config.ts';
import { services } from '../systems/services.ts';
import { Button } from './Button.ts';
import { canvasTex, css, darken, rr, vgrad, withShadow } from './gfx.ts';
import { BUTTON_COLORS, text, UI, type BtnColor } from './theme.ts';
import type { IconName } from './icons.ts';

const SH = 24; // shadow margin in panel textures

/** White rounded card with a soft shadow (cached per size). */
export function panelTex(scene: Phaser.Scene, w: number, h: number, tint = 0xf2f6fc) {
  const W = Math.round(w);
  const H = Math.round(h);
  return canvasTex(scene, `panel_${W}x${H}_${tint.toString(16)}`, W + SH * 2, H + SH * 2, (ctx) => {
    withShadow(ctx, 'rgba(18,28,70,0.35)', 26, 0, 10, () => {
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, SH, SH, W, H, 44);
      ctx.fill();
    });
    ctx.fillStyle = vgrad(ctx, SH, SH + H, [[0, 0xffffff], [1, tint]]);
    rr(ctx, SH, SH, W, H, 44);
    ctx.fill();
    ctx.strokeStyle = css(0xdae3f1);
    ctx.lineWidth = 4;
    rr(ctx, SH + 2, SH + 2, W - 4, H - 4, 42);
    ctx.stroke();
  });
}

export function panelImage(scene: Phaser.Scene, x: number, y: number, w: number, h: number, tint?: number) {
  return scene.add.image(x, y, panelTex(scene, w, h, tint)).setDisplaySize(w + SH * 2, h + SH * 2);
}

/** Ribbon banner with folded ends, for popup titles and section headers. */
export function ribbonTex(scene: Phaser.Scene, color: BtnColor, w: number, h: number) {
  const W = Math.round(w);
  const H = Math.round(h);
  const c = BUTTON_COLORS[color];
  const tail = H * 0.42;
  return canvasTex(scene, `ribbon_${color}_${W}x${H}`, W + 20, H + 20, (ctx) => {
    const x = 10;
    const y = 10;
    // folded tails behind
    ctx.fillStyle = css(darken(c.edge, 0.15));
    for (const s of [0, 1]) {
      ctx.beginPath();
      const ex = s ? x + W : x;
      const d = s ? -1 : 1;
      ctx.moveTo(ex, y + H * 0.22);
      ctx.lineTo(ex + d * tail * 1.4, y + H * 0.22);
      ctx.lineTo(ex + d * tail * 1.4, y + H);
      ctx.lineTo(ex, y + H);
      ctx.lineTo(ex + d * tail * 0.5, y + H * 0.61);
      ctx.closePath();
      ctx.fill();
    }
    withShadow(ctx, 'rgba(18,28,70,0.3)', 10, 0, 5, () => {
      ctx.fillStyle = css(c.edge);
      rr(ctx, x + tail, y + 6, W - tail * 2, H - 6, 18);
      ctx.fill();
    });
    ctx.fillStyle = vgrad(ctx, y, y + H - 6, [[0, c.top], [1, c.bottom]]);
    rr(ctx, x + tail, y, W - tail * 2, H - 8, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    rr(ctx, x + tail + 12, y + 5, W - tail * 2 - 24, (H - 8) * 0.34, 12);
    ctx.fill();
  });
}

export interface PopupButton {
  text: string;
  color?: BtnColor;
  icon?: IconName;
  onClick: () => void;
  keepOpen?: boolean; // by default a button closes the popup first
}

export interface PopupOpts {
  title: string;
  ribbon?: BtnColor;
  body?: string;
  width?: number;
  height?: number;
  buttons?: PopupButton[];
  /** Show a close button; its callback runs after the popup closes. */
  onClose?: () => void;
  /** Extra content inside the card. `area` is relative to the popup center. */
  content?: (c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }) => void;
}

/** Modal popup: dimmed backdrop, card, ribbon title, optional body text, buttons. Enter and Escape work on desktop. */
export class Popup extends Phaser.GameObjects.Container {
  private closed = false;
  readonly pw: number;
  readonly ph: number;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private keyHandlers: [string, () => void][] = [];

  constructor(scene: Phaser.Scene, opts: PopupOpts) {
    super(scene, view.w / 2, view.h / 2);
    const buttons = opts.buttons ?? [];
    const w = Math.min(opts.width ?? 820, view.w - 56);
    const stacked = buttons.length > 2 || buttons.some((b) => b.text.length > 12);
    const bh = 124;
    const btnBlock = buttons.length ? (stacked ? buttons.length * (bh + 22) : bh + 20) : 0;
    const h = Math.min(opts.height ?? 280 + btnBlock + (opts.body ? 150 : 0), view.h - 140);
    this.pw = w;
    this.ph = h;

    this.dim = scene.add.rectangle(view.w / 2, view.h / 2, view.w + 40, view.h + 40, 0x0b1230, 0.55).setInteractive().setDepth(999).setAlpha(0);
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 180 });

    const top = -h / 2;
    const card = panelImage(scene, 0, 0, w, h);
    const rw = Math.min(w * 0.86, 680);
    const ribbon = scene.add.image(0, top + 8, ribbonTex(scene, opts.ribbon ?? 'blue', rw, 118)).setDisplaySize(rw + 20, 138);
    const title = text(scene, 0, top + 2, opts.title, 58, { color: '#FFFFFF', stroke: BUTTON_COLORS[opts.ribbon ?? 'blue'].stroke || UI.inkCss, strokeW: 9 });
    if (title.width > rw - 140) title.setScale((rw - 140) / title.width);
    this.add([card, ribbon, title]);

    if (opts.onClose) {
      const x = new Button(scene, w / 2 - 30, top + 30, 92, 92, { icon: 'close', color: 'red', onClick: () => this.close(opts.onClose) });
      this.add(x);
      this.key('ESC', () => this.close(opts.onClose));
    }

    let y = top + 110;
    if (opts.body) {
      const b = text(scene, 0, y, opts.body, 42, { color: UI.inkCss, weight: 600, wrap: w - 110, lineSpacing: 6 }).setOrigin(0.5, 0);
      this.add(b);
      y += b.height + 30;
    }
    const bottom = h / 2 - 40;
    opts.content?.(this, { x: -w / 2 + 40, y, w: w - 80, h: bottom - btnBlock - y });

    buttons.forEach((b, i) => {
      const n = buttons.length;
      const bw = stacked ? Math.min(560, w - 120) : Math.min(340, (w - 100 - (n - 1) * 24) / n);
      const bx = stacked ? 0 : -((n - 1) * (bw + 24)) / 2 + i * (bw + 24);
      const by = stacked ? bottom - bh / 2 - (n - 1 - i) * (bh + 22) : bottom - bh / 2;
      const btn = new Button(scene, bx, by, bw, bh, {
        text: b.text,
        icon: b.icon,
        color: b.color ?? (i === n - 1 ? 'green' : 'blue'),
        onClick: () => {
          if (!b.keepOpen) this.close();
          b.onClick();
        },
      });
      this.add(btn);
    });
    // Enter = the last (primary) button
    const primary = buttons[buttons.length - 1];
    if (primary) this.key('ENTER', () => {
      if (!primary.keepOpen) this.close();
      primary.onClick();
    });

    this.setDepth(1000).setScale(0.75).setAlpha(0);
    scene.add.existing(this);
    scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    services().audio.play('popup');
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.dim.destroy();
      this.unbindKeys();
    });
  }

  private key(k: string, fn: () => void) {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    const h = () => {
      if (!this.closed) fn();
    };
    kb.on(`keydown-${k}`, h);
    this.keyHandlers.push([`keydown-${k}`, h]);
  }

  private unbindKeys() {
    const kb = this.scene?.input?.keyboard;
    for (const [e, h] of this.keyHandlers) kb?.off(e, h);
    this.keyHandlers = [];
  }

  get isClosed() {
    return this.closed;
  }

  close(after?: () => void) {
    if (this.closed) return;
    this.closed = true;
    this.unbindKeys();
    services().audio.play('popclose');
    this.scene.tweens.add({ targets: this.dim, alpha: 0, duration: 160 });
    this.scene.tweens.add({
      targets: this,
      scale: 0.85,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.destroy();
        after?.();
      },
    });
  }
}

/** Short message that floats up and fades. */
export function toast(scene: Phaser.Scene, msg: string, y = view.h * 0.3, color = 0x1f3566) {
  const t = text(scene, 0, 0, msg, 42, { color: '#FFFFFF' });
  const w = Math.min(view.w - 60, t.width + 70);
  if (t.width > w - 50) t.setScale((w - 50) / t.width);
  const bg = scene.add.graphics().fillStyle(color, 0.94).fillRoundedRect(-w / 2, -44, w, 88, 44);
  const c = scene.add.container(view.w / 2, y + 30, [bg, t]).setDepth(1300).setAlpha(0);
  scene.tweens.add({ targets: c, y, alpha: 1, duration: 220, ease: 'Back.Out' });
  scene.tweens.add({ targets: c, alpha: 0, y: y - 40, delay: 1600, duration: 400, onComplete: () => c.destroy() });
  return c;
}

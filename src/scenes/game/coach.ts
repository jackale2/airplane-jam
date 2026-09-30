import type Phaser from 'phaser';
import { view } from '../../config.ts';
import { forever } from '../../ui/fx.ts';
import { canvasTex, rr } from '../../ui/gfx.ts';
import { text, UI } from '../../ui/theme.ts';

/**
 * Tutorial helper: dims the screen except for a rounded spotlight, shows a speech bubble and a tapping
 * hand. Purely visual: taps still go to the game underneath.
 */
export class Coach {
  private readonly scene: Phaser.Scene;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private n = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  clear() {
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  /** Spotlight a rectangle (design px) and explain it. */
  show(o: { hole?: { x: number; y: number; w: number; h: number }; msg: string; msgY: number; hand?: { x: number; y: number }; dim?: boolean }) {
    this.clear();
    const s = this.scene;
    if (o.hole && o.dim !== false) {
      const key = `coach_${++this.n}`;
      const h = o.hole;
      canvasTex(s, key, view.w, view.h, (ctx) => {
        ctx.fillStyle = 'rgba(8,14,40,0.55)';
        ctx.fillRect(0, 0, view.w, view.h);
        ctx.globalCompositeOperation = 'destination-out';
        rr(ctx, h.x - 14, h.y - 14, h.w + 28, h.h + 28, 26);
        ctx.fill();
      });
      const dimImg = s.add.image(0, 0, key).setOrigin(0, 0).setScale(1 / view.res).setDepth(80).setAlpha(0);
      s.tweens.add({ targets: dimImg, alpha: 1, duration: 250 });
      dimImg.once('destroy', () => s.textures.remove(key));
      const glow = s.add.graphics().setDepth(81);
      glow.lineStyle(6, 0xffe27a, 1).strokeRoundedRect(h.x - 14, h.y - 14, h.w + 28, h.h + 28, 26);
      forever(s, { targets: glow, alpha: 0.35, yoyo: true, duration: 650 });
      this.objs.push(dimImg, glow);
    }
    this.objs.push(this.bubble(o.msg, o.msgY));
    if (o.hand) this.objs.push(this.hand(o.hand.x, o.hand.y));
  }

  bubble(msg: string, y: number) {
    const s = this.scene;
    const w = Math.min(820, view.w - 60);
    const t = text(s, 0, 0, msg, 44, { color: UI.inkCss, weight: 600, wrap: w - 80, lineSpacing: 4 });
    const h = t.height + 56;
    const g = s.add.graphics();
    g.fillStyle(0x0f1c3d, 0.25).fillRoundedRect(-w / 2, -h / 2 + 7, w, h, 34);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 34);
    g.lineStyle(5, 0xffc93c, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
    const c = s.add.container(view.w / 2, y, [g, t]).setDepth(85).setScale(0.6).setAlpha(0);
    s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    return c;
  }

  hand(x: number, y: number) {
    const s = this.scene;
    const img = s.add.image(x + 40, y + 50, 'hand').setDisplaySize(120, 120).setDepth(86).setOrigin(0.25, 0.1);
    forever(s, { targets: img, x: x + 24, y: y + 28, scale: img.scale * 0.88, duration: 420, yoyo: true, ease: 'Sine.InOut' });
    return img;
  }
}

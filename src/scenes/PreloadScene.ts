import Phaser from 'phaser';
import { view } from '../config.ts';
import { IMAGES, MUSIC } from '../data/assets.ts';
import { makePlaneShadows, queueLivery, queueTravelers } from '../systems/artLoader.ts';
import { services } from '../systems/services.ts';
import { canvasTex, css, rr } from '../ui/gfx.ts';
import { icon } from '../ui/icons.ts';
import { text } from '../ui/theme.ts';
import { makeTitle } from '../ui/title.ts';
import { setPageColor } from './BaseScene.ts';

const TIPS = [
  'Tip: a plane can only leave if its path is clear.',
  'Tip: planes wait at gates, so keep one gate free.',
  'Tip: watch the front of the line before you tap.',
  'Tip: three stars means no boosters used.',
  'Tip: Zen mode never ends. Relax!',
];

/** Loads every asset behind a progress bar with a little plane flying along it. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const cam = this.cameras.main;
    cam.setZoom(view.res).centerOn(view.w / 2, view.h / 2);
    setPageColor(0x6ec8f5);
    const w = view.w;
    const h = view.h;
    this.add
      .image(0, 0, canvasTex(this, `splash_${w}x${h}`, w, h, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#6EC8F5');
        g.addColorStop(1, '#D4F1FF');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (const [x, y, s] of [[0.2, 0.18, 1], [0.78, 0.12, 1.2], [0.6, 0.72, 0.9], [0.14, 0.82, 1.1]] as const) {
          ctx.beginPath();
          ctx.ellipse(w * x, h * y, 110 * s, 36 * s, 0, 0, Math.PI * 2);
          ctx.ellipse(w * x - 50 * s, h * y + 6 * s, 60 * s, 30 * s, 0, 0, Math.PI * 2);
          ctx.ellipse(w * x + 46 * s, h * y - 12 * s, 64 * s, 40 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }))
      .setOrigin(0, 0)
      .setScale(1 / view.res);
    makeTitle(this, w / 2, h * 0.36, Math.min(1, w / 1080));

    const bw = Math.min(680, w - 160);
    const bh = 46;
    const by = h * 0.62;
    this.add.image(w / 2, by, canvasTex(this, `pbar_${bw}`, bw + 20, bh + 20, (ctx) => {
      ctx.fillStyle = 'rgba(27,42,82,0.25)';
      rr(ctx, 10, 14, bw, bh, bh / 2);
      ctx.fill();
      ctx.fillStyle = css(0xffffff, 0.85);
      rr(ctx, 10, 10, bw, bh, bh / 2);
      ctx.fill();
    })).setScale(1 / view.res);
    const fill = this.add.graphics();
    const plane = icon(this, w / 2 - bw / 2, by - 8, 'plane', 76, 0xff5a5f);
    const pct = text(this, w / 2, by + 74, '0%', 38, { color: '#1B2A52', weight: 600 });
    text(this, w / 2, by + 150, Phaser.Utils.Array.GetRandom(TIPS), 36, { color: '#35507F', weight: 600, wrap: w - 140 });
    this.load.on('progress', (p: number) => {
      const fw = Math.max(bh - 12, (bw - 12) * p);
      fill.clear().fillStyle(0x2db353, 1).fillRoundedRect(w / 2 - bw / 2 + 6, by - bh / 2 + 6, fw, bh - 12, (bh - 12) / 2);
      fill.fillStyle(0xffffff, 0.35).fillRoundedRect(w / 2 - bw / 2 + 12, by - bh / 2 + 8, Math.max(0, fw - 12), 8, 4);
      plane.x = w / 2 - bw / 2 + 6 + fw;
      pct.setText(`${Math.round(p * 100)}%`);
    });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('[assets] failed to load', f.key, f.url));

    for (const [key, path] of Object.entries(IMAGES)) this.load.image(key, path);
    queueLivery(this, services().save.data.cosmetics.livery);
    queueTravelers(this);
    if (this.registry.get('hasMusic')) this.load.audio('music', MUSIC); // optional: no file, generated music
  }

  create() {
    makePlaneShadows(this, services().save.data.cosmetics.livery);
    services().audio.syncMusic();
    this.cameras.main.fadeOut(200, 255, 255, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Home'));
  }
}

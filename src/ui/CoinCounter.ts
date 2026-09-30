import Phaser from 'phaser';
import { services } from '../systems/services.ts';
import { icon } from './icons.ts';
import { fmt, text, UI } from './theme.ts';

/** Coin icon and balance on a dark pill. `refresh` counts up to the new balance; `flyTo` lands coins in it. */
export class CoinCounter extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private readonly coin: Phaser.GameObjects.Image;
  private shown: number;
  private counter?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, w = 250) {
    super(scene, x, y);
    this.shown = services().economy.coins;
    const h = 80;
    const bg = scene.add.graphics();
    bg.fillStyle(0x0f1c3d, 0.35).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, h / 2);
    bg.fillStyle(UI.pill, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(3, 0xffffff, 0.25).strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, h / 2 - 2);
    this.coin = icon(scene, -w / 2 + 38, -2, 'coin', 78);
    this.label = text(scene, 16, -2, fmt(this.shown), 44, { color: '#FFFFFF' });
    this.add([bg, this.coin, this.label]);
    scene.add.existing(this);
  }

  get coinPos() {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx + this.coin.x * m.a, y: m.ty + this.coin.y * m.d };
  }

  set value(v: number) {
    this.shown = v;
    this.label.setText(fmt(Math.round(v)));
  }

  /** Count up or down to the current balance. */
  refresh(duration = 500) {
    const target = services().economy.coins;
    this.counter?.stop();
    if (Math.round(this.shown) === target) return;
    this.counter = this.scene.tweens.addCounter({
      from: this.shown,
      to: target,
      duration,
      ease: 'Quad.Out',
      onUpdate: (t) => (this.value = t.getValue() ?? target),
    });
  }

  /** Bump the coin icon (a coin landed). */
  pulse() {
    this.scene.tweens.killTweensOf(this.coin);
    this.coin.setScale(this.coin.scaleX);
    this.scene.tweens.add({ targets: this.coin, scale: { from: this.coin.scaleX * 1.25, to: this.coin.scaleX }, duration: 180, ease: 'Quad.Out' });
  }

  /**
   * Fly `n` coin sprites from (x, y) into the counter along soft arcs; each landing ticks the sound and the
   * number up a little. The balance must already include the coins.
   */
  flyFrom(x: number, y: number, amount: number, n = Math.min(14, Math.max(4, Math.round(amount / 10)))) {
    const s = this.scene;
    const to = this.coinPos;
    const start = this.shown;
    const target = services().economy.coins;
    for (let i = 0; i < n; i++) {
      const c = icon(s, x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-40, 40), 'coin', 64).setDepth(2000).setScale(0);
      const mid = { x: (c.x + to.x) / 2 + Phaser.Math.Between(-220, 220), y: Math.min(c.y, to.y) - Phaser.Math.Between(60, 220) };
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(c.x, c.y), new Phaser.Math.Vector2(mid.x, mid.y), new Phaser.Math.Vector2(to.x, to.y));
      const t = { p: 0 };
      s.tweens.add({ targets: c, scale: 64 / c.width, duration: 160, delay: i * 45, ease: 'Back.Out' });
      s.tweens.add({
        targets: t,
        p: 1,
        delay: 180 + i * 55,
        duration: 520,
        ease: 'Sine.In',
        onUpdate: () => {
          const pt = curve.getPoint(t.p);
          c.setPosition(pt.x, pt.y);
        },
        onComplete: () => {
          c.destroy();
          this.value = start + ((target - start) * (i + 1)) / n;
          this.pulse();
          services().audio.play('coin', { rate: 1 + i * 0.04 });
        },
      });
    }
  }
}

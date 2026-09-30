import Phaser from 'phaser';
import { REGION, W } from '../config.ts';
import { services } from '../systems/services.ts';
import { Button, FONT } from './Button.ts';

const PILL = 0x16305c;

/** Coin icon and count on a dark pill. */
export class CoinCounter extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;
  private shown: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.shown = services().economy.coins;
    const bg = scene.add.graphics().fillStyle(PILL, 1).fillRoundedRect(-130, -42, 260, 84, 42);
    const icon = scene.add.image(-88, 0, 'coin').setDisplaySize(64, 64);
    this.text = scene.add.text(-40, 0, String(this.shown), { fontFamily: FONT, fontStyle: 'bold', fontSize: '50px', color: '#FFFFFF' }).setOrigin(0, 0.5);
    this.add([bg, icon, this.text]);
    scene.add.existing(this);
  }

  /** Count up or down to the current balance. */
  refresh() {
    const target = services().economy.coins;
    this.scene.tweens.addCounter({
      from: this.shown,
      to: target,
      duration: 400,
      onUpdate: (t) => this.text.setText(String(Math.round(t.getValue() ?? target))),
      onComplete: () => (this.shown = target),
    });
  }
}

/** Top bar of the game screen: pause, restart, level pill, coins. */
export class Hud extends Phaser.GameObjects.Container {
  readonly coins: CoinCounter;

  constructor(scene: Phaser.Scene, level: number, onPause: () => void, onRestart: () => void) {
    super(scene, 0, 0);
    const cy = REGION.hud.h / 2 + 4;
    const bar = scene.add.graphics();
    bar.fillStyle(0x1d4a86, 1).fillRoundedRect(28, 16, W - 56, 120, 30).lineStyle(6, 0x123262, 1).strokeRoundedRect(28, 16, W - 56, 120, 30);
    const pause = new Button(scene, 120, cy, 110, 100, '', onPause, { icon: 'pause' });
    const restart = new Button(scene, 250, cy, 110, 100, '', onRestart, { icon: 'restart' });
    const pill = scene.add.graphics().fillStyle(PILL, 1).fillRoundedRect(W / 2 - 100, cy - 44, 270, 88, 44);
    const title = scene.add.text(W / 2 + 35, cy, `LEVEL ${level}`, { fontFamily: FONT, fontStyle: 'bold', fontSize: '52px', color: '#FFFFFF' }).setOrigin(0.5);
    this.coins = new CoinCounter(scene, W - 190, cy);
    this.add([bar, pause, restart, pill, title, this.coins]);
    scene.add.existing(this);
  }
}

import Phaser from 'phaser';
import { REGION, THEME, W } from '../config.ts';
import { services } from '../systems/services.ts';
import { Button, FONT, label } from './Button.ts';

/** Coin icon + count. */
export class CoinCounter extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;
  private shown: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.shown = services().economy.coins;
    const icon = scene.add.image(-70, 0, 'coin').setDisplaySize(64, 64);
    this.text = scene.add.text(-20, 0, String(this.shown), { fontFamily: FONT, fontSize: '44px', color: THEME.white, stroke: '#1B2340', strokeThickness: 8 }).setOrigin(0, 0.5);
    this.add([icon, this.text]);
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

/** Top bar of the game screen: pause, level number, restart, coins. */
export class Hud extends Phaser.GameObjects.Container {
  readonly coins: CoinCounter;

  constructor(scene: Phaser.Scene, level: number, onPause: () => void, onRestart: () => void) {
    super(scene, 0, 0);
    const cy = REGION.hud.h / 2 + 10;
    const pause = new Button(scene, 100, cy, 130, 110, 'II', onPause, { small: true, size: 48 });
    const restart = new Button(scene, 250, cy, 130, 110, 'R', onRestart, { small: true, size: 48 });
    const title = label(scene, W / 2 + 40, cy, `Level ${level}`, 56, THEME.white).setStroke('#1B2340', 10);
    this.coins = new CoinCounter(scene, W - 190, cy);
    this.add([pause, restart, title, this.coins]);
    scene.add.existing(this);
  }
}

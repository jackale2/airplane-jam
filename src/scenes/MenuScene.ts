import Phaser from 'phaser';
import { H, THEME, W } from '../config.ts';
import { planeKey } from '../data/assets.ts';
import { services } from '../systems/services.ts';
import { Button, label } from '../ui/Button.ts';
import { CoinCounter } from '../ui/Hud.ts';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const s = services();
    this.add.image(0, 0, 'bg').setOrigin(0, 0);

    // decorative planes crossing the sky
    for (let i = 0; i < 4; i++) {
      const p = this.add.image(-200, 300 + i * 190, planeKey(2 + (i % 3), (i * 2) % 8)).setDisplaySize(90, 90 * (2 + (i % 3))).setRotation(Math.PI / 2).setAlpha(0.9);
      this.tweens.add({ targets: p, x: W + 300, duration: 9000 + i * 1800, delay: i * 1600, repeat: -1, repeatDelay: 1000 });
    }

    label(this, W / 2, 330, 'AIRPLANE\nJAM', 150, '#FFFFFF').setStroke('#1B2340', 18).setLineSpacing(-10);
    new CoinCounter(this, W - 190, 90);

    new Button(this, W / 2, 1250, 760, 200, `Play  Level ${s.save.data.level}`, () => this.scene.start('Game', { level: s.save.data.level }), { size: 64 });
    new Button(this, W / 2 - 200, 1520, 340, 130, 'Shop', () => this.scene.start('Shop'), { size: 48 });
    new Button(this, W / 2 + 200, 1520, 340, 130, 'Settings', () => this.scene.start('Settings'), { size: 48 });

    const daily = s.economy.dailyAvailable ? 'Daily bonus ready: win a level!' : 'Daily bonus claimed';
    label(this, W / 2, 1720, daily, 36, '#FFFFFF').setStroke('#1B2340', 8);
  }
}

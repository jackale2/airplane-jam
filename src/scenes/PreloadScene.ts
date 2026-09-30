import Phaser from 'phaser';
import { H, W } from '../config.ts';
import { makeBackgroundTexture } from '../ui/background.ts';
import { FONT } from '../ui/Button.ts';
import { services } from '../systems/services.ts';
import { IMAGES, MUSIC, planePath, SOUNDS, planeKey } from '../data/assets.ts';

/** Loads every asset behind a progress bar. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.cameras.main.setBackgroundColor(0x9fd7ee);
    this.add.text(W / 2, H / 2 - 120, 'AIRPLANE JAM', { fontFamily: FONT, fontStyle: 'bold', fontSize: '110px', color: '#FFFFFF', stroke: '#1B2340', strokeThickness: 14 }).setOrigin(0.5);
    const bar = this.add.graphics();
    const box = { x: W / 2 - 340, y: H / 2 + 20, w: 680, h: 50 };
    bar.fillStyle(0x1b2340, 1).fillRoundedRect(box.x, box.y, box.w, box.h, 25);
    const fill = this.add.graphics();
    this.load.on('progress', (p: number) => {
      fill.clear().fillStyle(0xfdd835, 1).fillRoundedRect(box.x + 6, box.y + 6, Math.max(20, (box.w - 12) * p), box.h - 12, 19);
    });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('[assets] failed to load', f.key, f.url));

    for (const [key, path] of Object.entries(IMAGES)) this.load.image(key, path);
    for (const [key, path] of Object.entries(SOUNDS)) this.load.audio(key, path);
    for (let length = 2; length <= 4; length++) {
      for (let color = 0; color < 8; color++) this.load.svg(planeKey(length, color), planePath(length, color), { scale: 2 });
    }
    if (this.registry.get('hasMusic')) this.load.audio('music', MUSIC); // optional: no file, no music
  }

  create() {
    makeBackgroundTexture(this);
    services().audio.syncMusic();
    this.scene.start('Menu');
  }
}

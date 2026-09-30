import Phaser from 'phaser';
import { H, W } from '../config.ts';
import { FONTS, MUSIC } from '../data/assets.ts';
import { initServices } from '../systems/services.ts';

/** Loads the fonts (Phaser text will not fetch a TTF by itself) and the save file, then hands over to Preload. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x9fd7ee);
    this.add.text(W / 2, H / 2, 'AIRPLANE JAM', { fontFamily: 'sans-serif', fontSize: '110px', color: '#FFFFFF', fontStyle: 'bold', stroke: '#1B2340', strokeThickness: 14 }).setOrigin(0.5);
    const fonts = Object.values(FONTS).map(async (f) => {
      const face = new FontFace(f.family, `url(${f.url})`, { weight: '300 700' });
      document.fonts.add(await face.load());
    });
    // music is optional: only load it if a real audio file exists (a dev server answers 404s with index.html)
    const music = fetch(MUSIC, { method: 'HEAD' })
      .then((r) => this.registry.set('hasMusic', r.ok && (r.headers.get('content-type') ?? '').startsWith('audio')))
      .catch(() => undefined);
    Promise.allSettled([...fonts, music]) // a missing font falls back to sans-serif, never blocks the game
      .then(() => initServices(this.game))
      .then(() => this.scene.start('Preload'));
  }
}

import Phaser from 'phaser';
import { view } from '../config.ts';
import { FONTS, MUSIC } from '../data/assets.ts';
import { initServices } from '../systems/services.ts';

/** Loads the font (Phaser text will not fetch a TTF by itself) and the save file, then hands over to Preload. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const cam = this.cameras.main;
    cam.setZoom(view.res).centerOn(view.w / 2, view.h / 2).setBackgroundColor(0x6ec8f5);
    const fonts = Object.values(FONTS).map(async (f) => {
      const face = new FontFace(f.family, `url(${f.url})`, { weight: '300 700' });
      document.fonts.add(await face.load());
    });
    // music is optional: only load it if a real audio file exists (a dev server answers 404s with index.html)
    const music = fetch(MUSIC, { method: 'HEAD' })
      .then((r) => this.registry.set('hasMusic', r.ok && (r.headers.get('content-type') ?? '').startsWith('audio')))
      .catch(() => undefined);
    Promise.allSettled([...fonts, music]) // a missing font falls back to a system font, never blocks the game
      .then(() => initServices(this.game))
      // Google Play Games: give a newer cloud save (new phone, reinstall) a few seconds to arrive
      .then((s) => Promise.race([s.cloud.start(), new Promise((r) => setTimeout(r, 4000))]))
      .then(() => this.scene.start('Preload'))
      .catch((e) => {
        console.error(e);
        this.scene.start('Preload');
      });
  }
}

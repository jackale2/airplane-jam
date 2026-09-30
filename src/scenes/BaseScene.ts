import Phaser from 'phaser';
import { view } from '../config.ts';
import { destinationFor } from '../meta/destinations.ts';
import { services } from '../systems/services.ts';
import { ensureFxTextures } from '../ui/fx.ts';
import { palette, sceneryTex, type ThemeId } from '../ui/scenery.ts';

/**
 * Shared scene plumbing: the camera maps design px to canvas px (view.res), scenes fade in and out,
 * and a window resize that changes the layout restarts the scene with `relayoutData()` so it can
 * pick up exactly where it was.
 */
export abstract class BaseScene extends Phaser.Scene {
  private leaving = false;

  /** Call first in create(). */
  protected setup(bg = 0x8fd6f7) {
    this.leaving = false;
    const cam = this.cameras.main;
    cam.setZoom(view.res);
    cam.centerOn(view.w / 2, view.h / 2);
    cam.setBackgroundColor(bg);
    cam.fadeIn(220, 255, 255, 255);
    ensureFxTextures(this);
    const onRelayout = () => this.relayout();
    this.game.events.on('relayout', onRelayout);
    this.events.once('shutdown', () => this.game.events.off('relayout', onRelayout));
    setPageColor(bg);
  }

  /** Scroll the camera vertically in design px (0 = top of the design space). */
  protected scrollCameraTo(y: number) {
    this.cameras.main.centerOn(view.w / 2, view.h / 2 + y);
  }

  /** Called when the window changes shape. Default: restart with the state from relayoutData(). */
  relayout() {
    if (this.leaving) return;
    this.scene.restart(this.relayoutData());
  }

  protected relayoutData(): object {
    return {};
  }

  /** Fade out, then start another scene. */
  go(key: string, data?: object) {
    if (this.leaving) return;
    this.leaving = true;
    services().audio.play('whoosh');
    this.input.enabled = false;
    this.cameras.main.fadeOut(170, 255, 255, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.input.enabled = true;
      this.scene.start(key, data);
    });
  }

  /** Full-screen scenery for the player's current destination and airport theme. */
  protected scenery(level: number, layout: 'hero' | 'sides', horizon: number, themeOverride?: ThemeId) {
    const s = services();
    const theme = themeOverride ?? (s.save.data.cosmetics.theme as ThemeId);
    const { index } = destinationFor(level);
    const key = sceneryTex(this, { dest: index, theme, w: view.w, h: view.h, horizon, layout });
    const img = this.add.image(0, 0, key).setOrigin(0, 0).setScale(1 / view.res).setDepth(-10);
    setPageColor(palette(index, theme).skyTop);
    return img;
  }

  /** Music key and feel for the destination of `level`. */
  protected moodFor(level: number, calm = false) {
    const { dest } = destinationFor(level);
    services().audio.setMood(dest.music.root, dest.music.flavour, calm);
    services().audio.syncMusic();
  }
}

/** Page and status-bar color behind the canvas (visible in notches and letterbox bars). */
export function setPageColor(c: number) {
  if (typeof document === 'undefined') return;
  const hex = '#' + c.toString(16).padStart(6, '0');
  document.body.style.background = hex;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hex);
}

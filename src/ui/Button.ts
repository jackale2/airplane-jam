import Phaser from 'phaser';
import { THEME } from '../config.ts';
import { services } from '../systems/services.ts';

export const FONT = 'KenVector, sans-serif';

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 48, color: string = THEME.panelText) {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5);
}

export interface ButtonOpts {
  small?: boolean;
  size?: number; // font size
  tint?: number;
  sound?: boolean;
}

/** Yellow Kenney button with a label. Min 48 dp tap target is met by sizing (>= 150 x 100 design px). */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Image;
  readonly text: Phaser.GameObjects.Text;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    this.bg = scene.add.image(0, 0, opts.small ? 'buttonSmall' : 'buttonLarge').setDisplaySize(w, h);
    if (opts.tint !== undefined) this.bg.setTint(opts.tint);
    this.text = label(scene, 0, -4, text, opts.size ?? Math.round(h * 0.42));
    this.add([this.bg, this.text]);
    this.setSize(w, h).setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      scene.tweens.add({ targets: this, scale: 0.94, duration: 60, yoyo: true });
      if (opts.sound !== false) services().audio.play('click');
      onClick();
    });
    scene.add.existing(this);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.5);
    return this;
  }
}

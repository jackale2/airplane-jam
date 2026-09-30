import Phaser from 'phaser';
import { H, W } from '../config.ts';
import { services } from '../systems/services.ts';
import { Button, label } from './Button.ts';

export interface PopupButton {
  text: string;
  onClick: () => void;
  keepOpen?: boolean; // by default a button closes the popup first
}

export interface PopupOpts {
  title: string;
  body?: string;
  buttons: PopupButton[];
  height?: number;
  /** Add extra content; `y` is the vertical center of the body area, relative to the popup center. */
  content?: (c: Phaser.GameObjects.Container, y: number) => void;
}

/** Modal popup: dimmed backdrop, panel, title, body text, stacked buttons. */
export class Popup extends Phaser.GameObjects.Container {
  private closed = false;

  constructor(scene: Phaser.Scene, opts: PopupOpts) {
    super(scene, W / 2, H / 2);
    const h = opts.height ?? 300 + opts.buttons.length * 150 + (opts.body ? 100 : 0);
    const dim = scene.add.rectangle(0, 0, W * 2, H * 2, 0x000000, 0.55).setInteractive(); // swallows taps behind
    const panel = scene.add.image(0, 0, 'panel').setDisplaySize(760, h);
    const top = -h / 2;
    const title = label(scene, 0, top + 90, opts.title, 56);
    this.add([dim, panel, title]);
    let y = top + 190;
    if (opts.body) {
      this.add(scene.add.text(0, y + 20, opts.body, { fontFamily: 'KenVectorThin, sans-serif', fontSize: '40px', color: '#1B2340', align: 'center', wordWrap: { width: 640 } }).setOrigin(0.5, 0));
      y += 110;
    }
    opts.content?.(this, y);
    const bottom = h / 2 - 90;
    opts.buttons.forEach((b, i) => {
      const by = bottom - (opts.buttons.length - 1 - i) * 150;
      this.add(new Button(scene, 0, by, 560, 120, b.text, () => {
        if (!b.keepOpen) this.close();
        b.onClick();
      }, { size: 44 }));
    });
    this.setDepth(1000).setScale(0.8).setAlpha(0);
    scene.add.existing(this);
    scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 160, ease: 'Back.Out' });
    services().audio.play('popup');
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    services().audio.play('popup');
    this.scene.tweens.add({ targets: this, scale: 0.85, alpha: 0, duration: 120, onComplete: () => this.destroy() });
  }
}

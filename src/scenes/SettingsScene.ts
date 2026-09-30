import Phaser from 'phaser';
import { THEME, W } from '../config.ts';
import { services } from '../systems/services.ts';
import { Button, label } from '../ui/Button.ts';

// TODO(owner): replace with the published privacy policy URL before release.
const PRIVACY_URL = 'https://example.com/privacy';

const TOGGLES = [
  ['sound', 'Sound'],
  ['music', 'Music'],
  ['vibration', 'Vibration'],
  ['symbols', 'Symbols'],
] as const;

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    const s = services();
    this.add.image(0, 0, 'bg').setOrigin(0, 0);
    label(this, W / 2, 220, 'Settings', 110, '#FFFFFF').setStroke('#1B2340', 16);
    TOGGLES.forEach(([key, name], i) => {
      const b: Button = new Button(this, W / 2, 470 + i * 190, 820, 150, '', () => {
        s.save.data.settings[key] = !s.save.data.settings[key];
        s.save.save();
        s.audio.syncMusic();
        show();
      }, { size: 46 });
      const show = () => b.text.setText(`${name}: ${s.save.data.settings[key] ? 'On' : 'Off'}`);
      show();
    });
    const note = label(this, W / 2, 1600, '', 34, '#FFFFFF').setStroke('#1B2340', 8);
    new Button(this, W / 2 - 205, 1290, 400, 120, 'Restore', async () => note.setText((await s.iap.restore()) ? 'Purchases restored' : 'Nothing to restore'), { size: 40 });
    new Button(this, W / 2 + 205, 1290, 400, 120, 'Privacy', () => window.open(PRIVACY_URL, '_blank'), { size: 40 });
    new Button(this, W / 2, 1460, 500, 130, 'Back', () => this.scene.start('Menu'), { size: 48 });
  }
}

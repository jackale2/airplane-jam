import Phaser from 'phaser';
import { THEME, W } from '../config.ts';
import { TUNING } from '../data/tuning.ts';
import { services } from '../systems/services.ts';
import { Button, label } from '../ui/Button.ts';
import { CoinCounter } from '../ui/Hud.ts';

/** Coin packs and Remove Ads. Prices come from the store once the IAP plugin is wired (Milestone 6). */
export class ShopScene extends Phaser.Scene {
  private note!: Phaser.GameObjects.Text;

  constructor() {
    super('Shop');
  }

  create() {
    const s = services();
    this.add.image(0, 0, 'bg').setOrigin(0, 0);
    label(this, W / 2, 220, 'Shop', 110, '#FFFFFF').setStroke('#1B2340', 16);
    const coins = new CoinCounter(this, W / 2 + 120, 370);
    this.note = label(this, W / 2, 1650, '', 36, '#FFFFFF').setStroke('#1B2340', 8);

    const buy = async (id: string) => {
      const ok = await s.iap.buy(id);
      this.note.setText(ok ? 'Thank you!' : 'Purchases are not available in this build yet.');
      if (ok) s.audio.play('coin');
      coins.refresh();
      this.scene.restart();
    };
    TUNING.coinPacks.forEach((p, i) => new Button(this, W / 2, 560 + i * 200, 820, 160, `${p.label}  ${p.coins} coins`, () => buy(p.id), { size: 46 }));
    const removed = s.save.data.adsRemoved;
    new Button(this, W / 2, 1210, 820, 160, removed ? 'Ads removed' : 'Remove Ads', () => (removed ? undefined : buy(TUNING.removeAdsId)), { size: 50 }).setEnabled(!removed);
    new Button(this, W / 2, 1480, 500, 130, 'Back', () => this.scene.start('Menu'), { size: 48 });
  }
}

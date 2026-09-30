import Phaser from 'phaser';
import { REGION, THEME, W } from '../config.ts';
import { TUNING, type BoosterId } from '../data/tuning.ts';
import { services } from '../systems/services.ts';
import { Button, FONT, label } from './Button.ts';

const BOOSTERS: { id: BoosterId; name: string }[] = [
  { id: 'extraGate', name: '+ Gate' },
  { id: 'sortQueue', name: 'Sort' },
  { id: 'shuffleBoard', name: 'Shuffle' },
];

/** Bottom bar: three booster buttons, each with its count (or coin cost when none are owned). */
export class BoosterBar extends Phaser.GameObjects.Container {
  private readonly info = new Map<BoosterId, { btn: Button; sub: Phaser.GameObjects.Text }>();

  constructor(scene: Phaser.Scene, onUse: (id: BoosterId) => void) {
    super(scene, 0, 0);
    const cy = REGION.boosters.y + REGION.boosters.h / 2;
    BOOSTERS.forEach((b, i) => {
      const x = W / 2 + (i - 1) * 340;
      const btn = new Button(scene, x, cy - 15, 310, 130, b.name, () => onUse(b.id), { size: 46 });
      const sub = label(scene, x, cy + 75, '', 34, THEME.white).setStroke('#1B2340', 8);
      sub.setFontFamily(FONT);
      this.add([btn, sub]);
      this.info.set(b.id, { btn, sub });
    });
    this.refresh();
    scene.add.existing(this);
  }

  /** Update the count / cost line under each button. */
  refresh() {
    const eco = services().economy;
    for (const [id, { sub }] of this.info) {
      const n = eco.count(id);
      sub.setText(n > 0 ? `x${n}` : `${TUNING.boosterCost[id]} coins or ad`);
    }
  }

  setEnabled(on: boolean) {
    for (const { btn } of this.info.values()) btn.setEnabled(on);
  }
}

import Phaser from 'phaser';
import { REGION, W } from '../config.ts';
import { TUNING, type BoosterId } from '../data/tuning.ts';
import { services } from '../systems/services.ts';
import { Button, FONT, type ButtonOpts } from './Button.ts';

export const BOOSTERS: { id: BoosterId; name: string; tip: string; color: NonNullable<ButtonOpts['color']>; icon: NonNullable<ButtonOpts['icon']> }[] = [
  { id: 'extraGate', name: 'GATE', tip: 'Adds one extra parking gate for this level, so one more plane can wait for its passengers.', color: 'yellow', icon: 'gate' },
  { id: 'sortQueue', name: 'SORT', tip: 'Groups the next 8 passengers by color, so matching planes can board back to back.', color: 'green', icon: 'sort' },
  { id: 'shuffleBoard', name: 'SHUFFLE', tip: 'Re-arranges the planes still on the board into a new layout that can always be cleared.', color: 'blue', icon: 'shuffle' },
];

/** Bottom bar: three booster buttons, each with a readable caption (count, or coin cost when none are owned). */
export class BoosterBar extends Phaser.GameObjects.Container {
  private readonly info = new Map<BoosterId, { btn: Button; sub: Phaser.GameObjects.Text; pill: Phaser.GameObjects.Graphics; x: number }>();

  constructor(scene: Phaser.Scene, onUse: (id: BoosterId) => void) {
    super(scene, 0, 0);
    const top = REGION.boosters.y;
    BOOSTERS.forEach((b, i) => {
      const x = W / 2 + (i - 1) * 345;
      const btn = new Button(scene, x, top + 80, 320, 130, b.name, () => onUse(b.id), { size: 38, color: b.color, icon: b.icon });
      const pill = scene.add.graphics();
      const sub = scene.add.text(x, top + 200, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '34px', color: '#FFFFFF' }).setOrigin(0.5);
      this.add([btn, pill, sub]);
      this.info.set(b.id, { btn, sub, pill, x });
    });
    this.refresh();
    scene.add.existing(this);
  }

  /** Update the caption under each button and size its dark pill to fit. */
  refresh() {
    const eco = services().economy;
    for (const [id, { sub, pill, x }] of this.info) {
      const n = eco.count(id);
      sub.setText(n > 0 ? `x${n}` : `${TUNING.boosterCost[id]} coins or ad`);
      const w = sub.width + 44;
      pill.clear().fillStyle(0x16305c, 0.92).fillRoundedRect(x - w / 2, sub.y - 30, w, 60, 30);
    }
  }

  setEnabled(on: boolean) {
    for (const { btn } of this.info.values()) btn.setEnabled(on);
  }
}

import Phaser from 'phaser';
import type { BoosterId } from '../../data/tuning.ts';
import { BOOSTER_IDS, TUNING } from '../../data/tuning.ts';
import type { Rect } from '../../layout/view.ts';
import { BOOSTER_UNLOCK } from '../../meta/progress.ts';
import { services } from '../../systems/services.ts';
import { Button } from '../../ui/Button.ts';
import { CoinCounter } from '../../ui/CoinCounter.ts';
import { icon, type IconName } from '../../ui/icons.ts';
import { text, UI, type BtnColor } from '../../ui/theme.ts';

export const BOOSTER_INFO: Record<BoosterId, { name: string; icon: IconName; color: BtnColor; tip: string }> = {
  extraGate: { name: 'Gate', icon: 'gate', color: 'yellow', tip: 'Opens one more gate for this level, so another plane can wait for its passengers.' },
  sortQueue: { name: 'Sort', icon: 'sort', color: 'green', tip: `Groups the next ${TUNING.sortQueueCount} passengers by color, so planes fill up back to back.` },
  shuffleBoard: { name: 'Shuffle', icon: 'shuffle', color: 'blue', tip: 'Re-parks the planes on the apron in a new layout that can always be cleared.' },
};

/** Top bar: pause, level (with a HARD tag), coins. In Zen mode the middle shows the passengers boarded. */
export class GameHud {
  readonly coins: CoinCounter;
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, r: Rect, o: { zen: boolean; level: number; hard: boolean; onPause: () => void }) {
    const cy = r.y + r.h / 2 + 4;
    const bs = Math.min(100, r.h - 16);
    new Button(scene, r.x + 30 + bs / 2, cy, bs, bs, { icon: o.zen ? 'home' : 'pause', color: 'white', onClick: o.onPause }).setDepth(70);
    const pillW = o.zen ? 340 : 300;
    const g = scene.add.graphics().setDepth(69);
    const px = r.x + r.w / 2;
    g.fillStyle(0x0f1c3d, 0.3).fillRoundedRect(px - pillW / 2, cy - 42 + 5, pillW, 84, 42);
    g.fillStyle(o.hard ? 0xc93a3f : UI.pill, 0.94).fillRoundedRect(px - pillW / 2, cy - 42, pillW, 84, 42);
    g.lineStyle(3, 0xffffff, 0.25).strokeRoundedRect(px - pillW / 2 + 2, cy - 40, pillW - 4, 80, 40);
    this.title = text(scene, px, cy - (o.zen ? 12 : 1), o.zen ? 'ZEN' : `Level ${o.level}`, o.zen ? 40 : 46, { color: '#FFFFFF' }).setDepth(70);
    if (o.zen) {
      icon(scene, px - 70, cy - 12, 'leaf', 40, 0x8ff0b4).setDepth(70);
      this.sub = text(scene, px, cy + 22, '0 boarded', 28, { color: '#BFD2FF', weight: 600 }).setDepth(70);
    }
    if (o.hard) {
      const tag = scene.add.container(px, cy + 50).setDepth(71);
      const tg = scene.add.graphics();
      tg.fillStyle(0xff5a5f, 1).fillRoundedRect(-78, -20, 156, 40, 20).lineStyle(3, 0xffffff, 1).strokeRoundedRect(-78, -20, 156, 40, 20);
      tag.add([tg, icon(scene, -46, -1, 'flame', 26, 0xffffff), text(scene, 12, -1, 'HARD', 26, { color: '#FFFFFF' })]);
      scene.tweens.add({ targets: tag, scale: 1.08, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
    }
    this.coins = new CoinCounter(scene, r.x + r.w - 30 - 125, cy).setDepth(70);
  }

  setZenCount(n: number, boards: number) {
    this.sub?.setText(`${n} boarded · ${boards} boards`);
  }
}

/** Bottom (or side) bar with the three boosters. Locked ones show the level that unlocks them. */
export class BoosterBar {
  private readonly scene: Phaser.Scene;
  private readonly buttons = new Map<BoosterId, { btn: Button; badge: Phaser.GameObjects.Container; x: number; y: number }>();
  private readonly level: number;

  constructor(scene: Phaser.Scene, r: Rect, vertical: boolean, level: number, onUse: (id: BoosterId) => void) {
    this.scene = scene;
    this.level = level;
    const n = BOOSTER_IDS.length;
    const size = vertical ? Math.min(170, r.w - 30, (r.h - 60) / n - 70) : Math.min(170, (r.w - 80) / n - 40, r.h - 86);
    BOOSTER_IDS.forEach((id, i) => {
      const info = BOOSTER_INFO[id];
      const x = vertical ? r.x + r.w / 2 : r.x + (r.w / n) * (i + 0.5);
      const y = vertical ? r.y + (r.h / n) * (i + 0.5) - 18 : r.y + r.h / 2 - 20;
      const locked = level < BOOSTER_UNLOCK[id];
      const btn = new Button(scene, x, y, size * 1.14, size, {
        icon: locked ? 'lock' : info.icon,
        iconSize: size * 0.52,
        color: locked ? 'dark' : info.color,
        onClick: () => (locked ? undefined : onUse(id)),
        sound: !locked,
      }).setDepth(70);
      if (locked) btn.setEnabled(false);
      text(scene, x, y + size / 2 + 26, locked ? `Level ${BOOSTER_UNLOCK[id]}` : info.name, 34, { color: '#FFFFFF', stroke: '#1B2A52', strokeW: 8 }).setDepth(70);
      const badge = scene.add.container(x + size * 0.5, y - size * 0.44).setDepth(71);
      this.buttons.set(id, { btn, badge, x, y });
    });
    this.refresh();
  }

  refresh() {
    const eco = services().economy;
    for (const [id, b] of this.buttons) {
      b.badge.removeAll(true);
      if (this.level < BOOSTER_UNLOCK[id]) continue;
      const n = eco.count(id);
      const g = this.scene.add.graphics();
      const col = n > 0 ? 0x3a82f0 : 0x2db353;
      g.fillStyle(0x0f1c3d, 0.3).fillCircle(0, 3, 27).fillStyle(col, 1).fillCircle(0, 0, 27).lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, 27);
      b.badge.add(g);
      b.badge.add(n > 0 ? text(this.scene, 0, -1, String(n), 30, { color: '#FFFFFF' }) : icon(this.scene, 0, 0, 'plus', 28, 0xffffff));
    }
  }

  pos(id: BoosterId) {
    const b = this.buttons.get(id)!;
    return { x: b.x, y: b.y };
  }

  pulse(id: BoosterId) {
    const b = this.buttons.get(id);
    if (b) this.scene.tweens.add({ targets: b.btn, scale: 1.12, duration: 220, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
  }
}

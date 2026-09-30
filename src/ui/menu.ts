import Phaser from 'phaser';
import { view } from '../config.ts';
import { services } from '../systems/services.ts';
import { Button } from './Button.ts';
import { CoinCounter } from './CoinCounter.ts';
import { canvasTex, rr, vgrad, withShadow } from './gfx.ts';
import { icon, type IconName } from './icons.ts';
import { text } from './theme.ts';

export type Tab = 'Shop' | 'Map' | 'Home' | 'Trophies';
const TABS: { key: Tab; icon: IconName; label: string }[] = [
  { key: 'Shop', icon: 'shop', label: 'Shop' },
  { key: 'Map', icon: 'map', label: 'Map' },
  { key: 'Home', icon: 'home', label: 'Home' },
  { key: 'Trophies', icon: 'trophy', label: 'Trophies' },
];

export const NAV_H = 176;
export const TOP_H = 140;

/** Bottom tab bar. The active tab is raised and colored; Trophies shows a red dot when something can be claimed. */
export class NavBar {
  private readonly buttons = new Map<Tab, Phaser.GameObjects.Container>();

  constructor(scene: Phaser.Scene & { go(key: string, data?: object): void }, active: Tab) {
    const w = Math.min(view.w, 1200);
    const x0 = (view.w - w) / 2;
    const y = view.h - NAV_H;
    const key = canvasTex(scene, `nav_${Math.round(w)}`, w + 40, NAV_H + 40, (ctx) => {
      withShadow(ctx, 'rgba(18,28,70,0.25)', 24, 0, -4, () => {
        ctx.fillStyle = '#FFFFFF';
        rr(ctx, 20, 26, w, NAV_H + 20, 48);
        ctx.fill();
      });
      ctx.fillStyle = vgrad(ctx, 26, 26 + NAV_H, [[0, 0xffffff], [1, 0xeaf1fb]]);
      rr(ctx, 20, 26, w, NAV_H + 20, 48);
      ctx.fill();
    });
    scene.add.image(view.w / 2, y + NAV_H / 2 + 4, key).setScale(1 / view.res).setDepth(200).setInteractive(); // swallows taps
    const n = TABS.length;
    TABS.forEach((t, i) => {
      const cx = x0 + (w / n) * (i + 0.5);
      const on = t.key === active;
      const c = scene.add.container(cx, y + NAV_H / 2 + 2).setDepth(201);
      if (on) {
        const g = scene.add.graphics();
        g.fillStyle(0x1f8540, 1).fillRoundedRect(-78, -86, 156, 128, 36).fillStyle(0x3fca63, 1).fillRoundedRect(-78, -92, 156, 124, 36);
        g.fillStyle(0xffffff, 0.25).fillRoundedRect(-66, -86, 132, 30, 15);
        c.add(g);
      }
      c.add(icon(scene, 0, on ? -34 : -18, t.icon, on ? 74 : 62, on ? 0xffffff : 0x8a97b8));
      c.add(text(scene, 0, on ? 16 : 38, t.label, on ? 30 : 28, { color: on ? '#FFFFFF' : '#8A97B8', weight: 700 }));
      c.setSize(w / n, NAV_H).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        if (on) return;
        services().audio.play('click');
        scene.go(t.key);
      });
      this.buttons.set(t.key, c);
    });
    this.refreshBadges(scene);
    const off = services().meta.onChange(() => this.refreshBadges(scene));
    scene.events.once('shutdown', off);
  }

  private refreshBadges(scene: Phaser.Scene) {
    const b = services().meta.badges;
    const c = this.buttons.get('Trophies');
    if (!c) return;
    (c.getData('dot') as Phaser.GameObjects.GameObject | undefined)?.destroy();
    if (b.trophies > 0) {
      const dot = scene.add.container(44, -58, [
        scene.add.graphics().fillStyle(0xff4d57, 1).fillCircle(0, 0, 20).lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, 20),
        text(scene, 0, -1, b.trophies > 9 ? '9+' : String(b.trophies), 24, { color: '#FFFFFF' }),
      ]);
      c.add(dot);
      c.setData('dot', dot);
    }
  }
}

/** Top bar for menu screens: optional settings or back button on the left, coins on the right. */
export function topBar(scene: Phaser.Scene, o: { left?: { icon: IconName; onClick: () => void }; title?: string }) {
  const y = TOP_H / 2 + 10;
  if (o.left) new Button(scene, 30 + 50, y, 100, 100, { icon: o.left.icon, color: 'white', onClick: o.left.onClick }).setDepth(210);
  if (o.title) text(scene, view.w / 2, y, o.title, 64, { color: '#FFFFFF', stroke: '#1B2A52', strokeW: 12, shadow: true }).setDepth(210);
  const coins: CoinCounter = new CoinCounter(scene, view.w - 30 - 125, y).setDepth(210);
  return { coins, y };
}

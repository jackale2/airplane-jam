import Phaser from 'phaser';
import { view } from '../config.ts';
import { outfitKey, planeKey, planePath, PLANE_SVG_SCALE, travelerKey } from '../data/assets.ts';
import { BOOSTER_IDS, TUNING } from '../data/tuning.ts';
import { cosmeticsOf, type Cosmetic, type CosmeticKind } from '../meta/cosmetics.ts';
import { destinationFor } from '../meta/destinations.ts';
import { services } from '../systems/services.ts';
import { Button } from '../ui/Button.ts';
import { sparkle } from '../ui/fx.ts';
import { icon, type IconName } from '../ui/icons.ts';
import { NavBar, NAV_H, TOP_H, topBar } from '../ui/menu.ts';
import { panelImage, toast } from '../ui/Popup.ts';
import { sceneryTex, type ThemeId } from '../ui/scenery.ts';
import { ScrollView } from '../ui/ScrollView.ts';
import { fmt, text, UI } from '../ui/theme.ts';
import { BOOSTER_INFO } from './game/hud.ts';
import { HAT_DY } from './game/queue.ts';
import { BaseScene } from './BaseScene.ts';
import type { CoinCounter } from '../ui/CoinCounter.ts';

type ShopTab = CosmeticKind | 'boosters';
const TABS: { key: ShopTab; label: string; icon: IconName }[] = [
  { key: 'livery', label: 'Planes', icon: 'plane' },
  { key: 'outfit', label: 'Travelers', icon: 'shirt' },
  { key: 'theme', label: 'Airports', icon: 'tower' },
  { key: 'boosters', label: 'Boosters', icon: 'bolt' },
];

/** Everything is bought with coins earned in play: plane liveries, traveler outfits, airport themes, boosters. */
export class ShopScene extends BaseScene {
  private tab: ShopTab = 'livery';
  private coins!: CoinCounter;
  private sv?: ScrollView;
  private scrollKeep = 0;

  constructor() {
    super('Shop');
  }

  init(data: { tab?: ShopTab; scroll?: number }) {
    this.tab = data.tab ?? 'livery';
    this.scrollKeep = data.scroll ?? 0;
  }

  create() {
    this.setup(0x8fd6f7);
    const s = services();
    this.scenery(s.save.data.level, 'hero', view.h * 0.9);
    this.add.rectangle(0, 0, view.w, view.h, 0xffffff, 0.35).setOrigin(0, 0).setDepth(-5);
    this.coins = topBar(this, { left: { icon: 'home', onClick: () => this.go('Home') }, title: 'Shop' }).coins;
    new NavBar(this, 'Shop');
    this.buildTabs();
    this.loadPreviews().then(() => this.alive() && this.buildGrid());
  }

  private alive() {
    return this.sys.isActive();
  }

  protected override relayoutData() {
    return { tab: this.tab, scroll: this.sv?.scroll ?? 0 };
  }

  /** Two sample planes per livery, so previews do not need every plane loaded. */
  private loadPreviews(): Promise<void> {
    return new Promise((resolve) => {
      let queued = false;
      for (const c of cosmeticsOf('livery')) {
        for (const color of [0, 5]) {
          const key = planeKey(c.id, 3, color);
          if (!this.textures.exists(key)) {
            this.load.svg(key, planePath(c.id, 3, color), { scale: PLANE_SVG_SCALE });
            queued = true;
          }
        }
      }
      if (!queued) return resolve();
      this.load.once('complete', () => resolve());
      this.load.start();
    });
  }

  private buildTabs() {
    const y = TOP_H + 60;
    const n = TABS.length;
    const tw = Math.min(250, (view.w - 60) / n - 12);
    TABS.forEach((t, i) => {
      const x = view.w / 2 + (i - (n - 1) / 2) * (tw + 12);
      new Button(this, x, y, tw, 96, {
        text: t.label,
        icon: t.icon,
        size: 30,
        iconSize: 38,
        color: t.key === this.tab ? 'blue' : 'white',
        onClick: () => t.key !== this.tab && this.scene.restart({ tab: t.key }),
      }).setDepth(60);
    });
  }

  private buildGrid() {
    const top = TOP_H + 130;
    const area = { x: 0, y: top, w: view.w, h: view.h - top - NAV_H + 20 };
    const cols = view.w >= 1500 ? 4 : view.w >= 1150 ? 3 : 2;
    const gap = 26;
    const cw = Math.min(460, (view.w - 60 - (cols - 1) * gap) / cols);
    const ch = cw * 1.12;
    const items: (Cosmetic | { id: string; booster: true })[] = this.tab === 'boosters' ? BOOSTER_IDS.map((id) => ({ id, booster: true as const })) : cosmeticsOf(this.tab);
    const rows = Math.ceil(items.length / cols);
    this.sv = new ScrollView(this, area, rows * (ch + gap) + 60, { depth: 20 });
    const x0 = view.w / 2 - ((cols - 1) * (cw + gap)) / 2;
    items.forEach((it, i) => {
      const x = x0 + (i % cols) * (cw + gap);
      const y = 20 + ch / 2 + Math.floor(i / cols) * (ch + gap);
      const card = this.add.container(x, y);
      this.sv!.content.add(card);
      card.add(panelImage(this, 0, 0, cw, ch));
      if ('booster' in it) this.boosterCard(card, it.id as (typeof BOOSTER_IDS)[number], cw, ch);
      else this.cosmeticCard(card, it, cw, ch);
    });
    this.sv.scrollTo(this.scrollKeep);
  }

  private preview(card: Phaser.GameObjects.Container, c: Cosmetic, cw: number, ch: number) {
    const py = -ch * 0.2;
    const ph = ch * 0.46;
    if (c.kind === 'livery') {
      for (const [color, dx, ang] of [[0, -cw * 0.16, -30], [5, cw * 0.16, 30]] as const) {
        const key = planeKey(c.id, 3, color);
        if (!this.textures.exists(key)) continue;
        const pw = ph * 0.33;
        card.add(this.add.image(dx, py, key).setDisplaySize(pw, pw * 3).setAngle(ang));
      }
    } else if (c.kind === 'outfit') {
      const h = ph * 0.95;
      [[1, 0, -cw * 0.22], [3, 5, 0], [4, 7, cw * 0.22]].forEach(([ch2, color, dx]) => {
        const img = this.add.image(dx!, py + h / 2, travelerKey(ch2!, color!)).setOrigin(0.5, 136 / 140).setDisplaySize(h * (100 / 140), h);
        card.add(img);
        if (c.id !== 'casual') card.add(this.add.image(dx!, py + h / 2 + HAT_DY[ch2!]! * (h / 140), outfitKey(c.id)).setOrigin(0.5, 136 / 140).setDisplaySize(h * (100 / 140), h));
      });
    } else {
      const w = cw - 50;
      const key = sceneryTex(this, { dest: destinationFor(services().save.data.level).index, theme: c.id as ThemeId, w, h: ph, horizon: ph * 0.78, layout: 'hero' });
      card.add(this.add.image(0, py, key).setScale(1 / view.res));
    }
  }

  private cosmeticCard(card: Phaser.GameObjects.Container, c: Cosmetic, cw: number, ch: number) {
    const s = services();
    this.preview(card, c, cw, ch);
    card.add(text(this, 0, ch * 0.1, c.name, 42, { color: UI.inkCss }));
    card.add(text(this, 0, ch * 0.19, c.blurb, 28, { color: UI.softCss, weight: 600 }));
    const owned = s.meta.owns(c.id);
    const equipped = s.meta.equipped(c.kind) === c.id;
    const afford = s.economy.coins >= c.price;
    const btn = new Button(this, 0, ch / 2 - 64, cw - 80, 96, {
      text: equipped ? 'Equipped' : owned ? 'Equip' : fmt(c.price),
      icon: equipped ? 'check' : owned ? undefined : 'coin',
      size: 38,
      iconSize: 52,
      color: equipped ? 'white' : owned ? 'blue' : afford ? 'green' : 'dark',
      onClick: () => {
        if (equipped) return;
        const r = s.meta.buyOrEquip(c.id);
        if (r === 'poor') {
          toast(this, `You need ${fmt(c.price - s.economy.coins)} more coins`, view.h * 0.3, 0xc93a3f);
          return;
        }
        if (r === 'bought') {
          s.audio.play('unlock');
          const m = card.getWorldTransformMatrix();
          sparkle(this, m.tx, m.ty, [0xffd447, 0xffffff], 18, 380);
          this.coins.refresh();
        }
        this.time.delayedCall(r === 'bought' ? 450 : 50, () => this.scene.restart({ tab: this.tab, scroll: this.sv?.scroll }));
      },
    });
    card.add(btn);
  }

  private boosterCard(card: Phaser.GameObjects.Container, id: (typeof BOOSTER_IDS)[number], cw: number, ch: number) {
    const s = services();
    const info = BOOSTER_INFO[id];
    const cost = TUNING.boosterCost[id];
    card.add(icon(this, 0, -ch * 0.2, info.icon, ch * 0.28, 0x3a82f0));
    card.add(text(this, 0, ch * 0.08, info.name, 42, { color: UI.inkCss }));
    const owned = text(this, 0, ch * 0.18, `You have ${s.economy.count(id)}`, 30, { color: UI.softCss, weight: 600 });
    card.add(owned);
    card.add(
      new Button(this, 0, ch / 2 - 64, cw - 80, 96, {
        text: fmt(cost),
        icon: 'coin',
        size: 38,
        iconSize: 52,
        color: s.economy.coins >= cost ? 'green' : 'dark',
        onClick: () => {
          if (!s.economy.spend(cost)) {
            toast(this, `You need ${fmt(cost - s.economy.coins)} more coins`, view.h * 0.3, 0xc93a3f);
            return;
          }
          s.economy.add(id);
          s.audio.play('coin');
          owned.setText(`You have ${s.economy.count(id)}`);
          this.coins.refresh();
        },
      }),
    );
  }
}

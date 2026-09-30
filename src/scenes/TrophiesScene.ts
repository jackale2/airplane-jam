import Phaser from 'phaser';
import { view } from '../config.ts';
import type { AchievementView } from '../meta/achievements.ts';
import { DESTINATIONS, destinationIndex, destinationRange } from '../meta/destinations.ts';
import { MISSION_BONUS, missionDone, missionText, type Mission, type MissionKind } from '../meta/missions.ts';
import { describeReward } from '../meta/rewards.ts';
import { services } from '../systems/services.ts';
import { Button } from '../ui/Button.ts';
import type { CoinCounter } from '../ui/CoinCounter.ts';
import { sparkle } from '../ui/fx.ts';
import { icon, type IconName } from '../ui/icons.ts';
import { NavBar, NAV_H, TOP_H, topBar } from '../ui/menu.ts';
import { panelImage, toast } from '../ui/Popup.ts';
import { sceneryTex, type ThemeId } from '../ui/scenery.ts';
import { ScrollView } from '../ui/ScrollView.ts';
import { fmt, text, UI } from '../ui/theme.ts';
import { BaseScene } from './BaseScene.ts';

type TTab = 'missions' | 'achievements' | 'postcards';
const TABS: { key: TTab; label: string; icon: IconName }[] = [
  { key: 'missions', label: 'Missions', icon: 'calendar' },
  { key: 'achievements', label: 'Awards', icon: 'trophy' },
  { key: 'postcards', label: 'Postcards', icon: 'globe' },
];
const MISSION_ICON: Record<MissionKind, IconName> = { board: 'person', depart: 'plane', win: 'trophy', perfect: 'star', color: 'palette', chain: 'bolt', zen: 'leaf', booster: 'gate' };

export class TrophiesScene extends BaseScene {
  private tab: TTab = 'missions';
  private coins!: CoinCounter;
  private sv?: ScrollView;
  private scrollKeep = 0;

  constructor() {
    super('Trophies');
  }

  init(data: { tab?: TTab; scroll?: number }) {
    this.tab = data.tab ?? 'missions';
    this.scrollKeep = data.scroll ?? 0;
  }

  create() {
    this.setup(0x8fd6f7);
    const s = services();
    s.meta.refreshDay();
    this.scenery(s.save.data.level, 'hero', view.h * 0.9);
    this.add.rectangle(0, 0, view.w, view.h, 0xffffff, 0.35).setOrigin(0, 0).setDepth(-5);
    this.coins = topBar(this, { left: { icon: 'home', onClick: () => this.go('Home') }, title: 'Trophies' }).coins;
    new NavBar(this, 'Trophies');
    this.buildTabs();
    if (this.tab === 'missions') this.missions();
    else if (this.tab === 'achievements') this.achievements();
    else this.postcards();
  }

  protected override relayoutData() {
    return { tab: this.tab, scroll: this.sv?.scroll ?? 0 };
  }

  private buildTabs() {
    const b = services().meta.badges;
    const y = TOP_H + 60;
    const n = TABS.length;
    const tw = Math.min(300, (view.w - 60) / n - 12);
    TABS.forEach((t, i) => {
      const x = view.w / 2 + (i - (n - 1) / 2) * (tw + 12);
      const btn = new Button(this, x, y, tw, 96, { text: t.label, icon: t.icon, size: 32, iconSize: 40, color: t.key === this.tab ? 'blue' : 'white', onClick: () => t.key !== this.tab && this.scene.restart({ tab: t.key }) }).setDepth(60);
      const count = t.key === 'missions' ? b.missions : t.key === 'achievements' ? b.achievements : 0;
      if (count) btn.setBadge(count);
    });
  }

  private list(height: number) {
    const top = TOP_H + 130;
    this.sv = new ScrollView(this, { x: 0, y: top, w: view.w, h: view.h - top - NAV_H + 20 }, height, { depth: 20 });
    return this.sv;
  }

  private bar(c: Phaser.GameObjects.Container, x: number, y: number, w: number, v: number, max: number, color = 0x3a82f0) {
    const g = this.add.graphics();
    const f = Math.max(0, Math.min(1, v / max));
    g.fillStyle(0xe3eaf5, 1).fillRoundedRect(x, y - 13, w, 26, 13);
    if (f > 0) g.fillStyle(color, 1).fillRoundedRect(x, y - 13, Math.max(26, w * f), 26, 13);
    c.add(g);
    c.add(text(this, x + w / 2, y, `${fmt(Math.min(v, max))} / ${fmt(max)}`, 24, { color: f > 0.5 ? '#FFFFFF' : UI.inkCss, stroke: f > 0.5 ? '#1D4A9C' : undefined, strokeW: 5 }));
  }

  private missions() {
    const s = services();
    const m = s.meta.missions;
    const cw = Math.min(940, view.w - 60);
    const ch = 220;
    const sv = this.list(80 + (m.list.length + 1) * (ch + 24) + 120);
    const now = new Date();
    const mins = 24 * 60 - (now.getHours() * 60 + now.getMinutes());
    sv.content.add(text(this, view.w / 2, 30, `New missions in ${Math.floor(mins / 60)}h ${mins % 60}m`, 34, { color: UI.inkCss, weight: 600 }));
    m.list.forEach((mission, i) => sv.content.add(this.missionCard(mission, i, view.w / 2, 90 + ch / 2 + i * (ch + 24), cw, ch)));
    // bonus chest for clearing all three
    const y = 90 + ch / 2 + m.list.length * (ch + 24);
    const c = this.add.container(view.w / 2, y);
    sv.content.add(c);
    c.add(panelImage(this, 0, 0, cw, ch, 0xfff4d6));
    c.add(icon(this, -cw / 2 + 100, 0, 'chest', 120));
    c.add(text(this, -cw / 2 + 190, -30, 'Bonus chest', 42, { color: UI.inkCss }).setOrigin(0, 0.5));
    c.add(text(this, -cw / 2 + 190, 22, `Claim all 3 missions: ${describeReward(MISSION_BONUS)}`, 28, { color: UI.softCss, weight: 600, wrap: cw - 470, align: 'left' }).setOrigin(0, 0.5));
    const ready = s.meta.bonusReady;
    const claimed = m.bonusClaimed;
    c.add(
      new Button(this, cw / 2 - 130, 0, 200, 100, {
        text: claimed ? 'Done' : 'Open',
        icon: claimed ? 'check' : undefined,
        size: 36,
        color: ready ? 'yellow' : claimed ? 'white' : 'dark',
        onClick: () => {
          if (!ready) return;
          const r = s.meta.claimMissionBonus();
          if (!r) return;
          s.audio.play('unlock');
          sparkle(this, view.w / 2, c.getWorldTransformMatrix().ty, [0xffd447, 0xffffff], 24, 420);
          if (r.coins) this.coins.flyFrom(view.w / 2, c.getWorldTransformMatrix().ty, r.coins);
          toast(this, `You got ${describeReward(r)}!`, view.h * 0.3, 0x6238c4);
          this.time.delayedCall(900, () => this.scene.restart({ tab: 'missions', scroll: this.sv?.scroll }));
        },
      }),
    );
    sv.scrollTo(this.scrollKeep);
  }

  private missionCard(m: Mission, i: number, x: number, y: number, cw: number, ch: number) {
    const s = services();
    const c = this.add.container(x, y);
    const done = missionDone(m);
    c.add(panelImage(this, 0, 0, cw, ch, m.claimed ? 0xe4f7e9 : 0xf2f6fc));
    const ic = MISSION_ICON[m.kind];
    const g = this.add.graphics().fillStyle(0x3a82f0, 0.14).fillCircle(-cw / 2 + 100, 0, 62);
    c.add([g, icon(this, -cw / 2 + 100, 0, ic, 70, 0x3a82f0)]);
    const tw = cw - 520;
    c.add(text(this, -cw / 2 + 190, -40, missionText(m), 36, { color: UI.inkCss, align: 'left', wrap: tw }).setOrigin(0, 0.5));
    this.bar(c, -cw / 2 + 190, 30, tw, m.progress, m.target);
    c.add(icon(this, cw / 2 - 250, -44, 'coin', 50));
    c.add(text(this, cw / 2 - 200, -44, `+${m.reward}`, 36, { color: '#8A5A00' }).setOrigin(0, 0.5));
    c.add(
      new Button(this, cw / 2 - 130, 30, 200, 96, {
        text: m.claimed ? 'Done' : done ? 'Claim' : 'Go',
        icon: m.claimed ? 'check' : undefined,
        size: 36,
        color: m.claimed ? 'white' : done ? 'green' : 'blue',
        onClick: () => {
          if (m.claimed) return;
          if (!done) {
            this.go(m.kind === 'zen' ? 'Game' : 'Game', m.kind === 'zen' ? { mode: 'zen' } : { mode: 'level', level: s.save.data.level });
            return;
          }
          const r = s.meta.claimMission(i);
          if (!r) return;
          s.audio.play('coin');
          this.coins.flyFrom(x, c.getWorldTransformMatrix().ty, r.coins ?? 0);
          this.time.delayedCall(900, () => this.scene.restart({ tab: 'missions', scroll: this.sv?.scroll }));
        },
      }),
    );
    return c;
  }

  private achievements() {
    const s = services();
    const list = s.meta.achievements().sort((a, b) => Number(b.claimable) - Number(a.claimable));
    const cw = Math.min(940, view.w - 60);
    const ch = 200;
    const sv = this.list(40 + list.length * (ch + 20) + 60);
    list.forEach((a, i) => sv.content.add(this.achievementCard(a, view.w / 2, 30 + ch / 2 + i * (ch + 20), cw, ch)));
    sv.scrollTo(this.scrollKeep);
  }

  private achievementCard(a: AchievementView, x: number, y: number, cw: number, ch: number) {
    const s = services();
    const c = this.add.container(x, y);
    const all = a.target === null;
    c.add(panelImage(this, 0, 0, cw, ch, all ? 0xfff4d6 : 0xf2f6fc));
    const g = this.add.graphics().fillStyle(all ? 0xffc93c : 0x8e5cf2, 0.16).fillCircle(-cw / 2 + 96, -8, 60);
    c.add([g, icon(this, -cw / 2 + 96, -8, a.def.icon, 66, all ? 0xe09a00 : 0x8e5cf2)]);
    for (let t = 0; t < a.def.tiers.length; t++) c.add(icon(this, -cw / 2 + 96 + (t - (a.def.tiers.length - 1) / 2) * 24, 64, t < a.claimed ? 'starGold' : 'starEmpty', 24));
    const tw = cw - 480;
    c.add(text(this, -cw / 2 + 180, -52, a.def.name, 38, { color: UI.inkCss }).setOrigin(0, 0.5));
    c.add(text(this, -cw / 2 + 180, -10, all ? 'All tiers complete!' : a.def.text(a.target!), 28, { color: UI.softCss, weight: 600 }).setOrigin(0, 0.5));
    if (!all) this.bar(c, -cw / 2 + 180, 40, tw, a.value, a.target!, 0x8e5cf2);
    if (a.claimable) {
      c.add(
        new Button(this, cw / 2 - 130, 0, 210, 100, {
          text: `+${a.reward}`,
          icon: 'coin',
          size: 36,
          iconSize: 48,
          color: 'green',
          onClick: () => {
            const r = s.meta.claimAchievement(a.def.id);
            if (!r) return;
            s.audio.play('unlock');
            this.coins.flyFrom(x + cw / 2 - 130, c.getWorldTransformMatrix().ty, r.coins ?? 0);
            this.time.delayedCall(900, () => this.scene.restart({ tab: 'achievements', scroll: this.sv?.scroll }));
          },
        }),
      );
    } else if (!all) c.add(text(this, cw / 2 - 130, 0, `+${a.reward}`, 34, { color: '#B8B8C8' }));
    return c;
  }

  private postcards() {
    const s = services();
    const reached = destinationIndex(s.save.data.level);
    const cols = view.w >= 1400 ? 4 : view.w >= 1000 ? 3 : 2;
    const gap = 24;
    const cw = Math.min(440, (view.w - 60 - (cols - 1) * gap) / cols);
    const ch = cw * 0.8;
    const n = DESTINATIONS.length;
    const sv = this.list(Math.ceil(n / cols) * (ch + gap) + 100);
    const theme = s.save.data.cosmetics.theme as ThemeId;
    const x0 = view.w / 2 - ((cols - 1) * (cw + gap)) / 2;
    DESTINATIONS.forEach((d, i) => {
      const x = x0 + (i % cols) * (cw + gap);
      const y = 20 + ch / 2 + Math.floor(i / cols) * (ch + gap);
      const c = this.add.container(x, y);
      sv.content.add(c);
      const open = i <= reached;
      c.add(this.add.graphics().fillStyle(0x0f1c3d, 0.2).fillRoundedRect(-cw / 2, -ch / 2 + 8, cw, ch, 18).fillStyle(0xffffff, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 18));
      const pw = cw - 28;
      const ph = ch - 90;
      if (open) {
        const key = sceneryTex(this, { dest: i, theme, w: pw, h: ph, horizon: ph * 0.8, layout: 'hero' });
        c.add(this.add.image(0, -ch / 2 + 14 + ph / 2, key).setScale(1 / view.res));
        c.add(icon(this, pw / 2 - 30, -ch / 2 + 44, 'plane', 44, 0xff5a5f).setAngle(-12));
      } else {
        c.add(this.add.graphics().fillStyle(0xdbe3ef, 1).fillRoundedRect(-pw / 2, -ch / 2 + 14, pw, ph, 12));
        c.add(icon(this, 0, -ch / 2 + 14 + ph / 2, 'lock', 72, 0xa9b5cc));
      }
      c.add(text(this, 0, ch / 2 - 40, open ? d.name : `Level ${destinationRange(i).first}`, 34, { color: open ? UI.inkCss : '#9AA6BF' }));
    });
    sv.scrollTo(this.scrollKeep);
  }
}

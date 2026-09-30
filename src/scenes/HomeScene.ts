import Phaser from 'phaser';
import { view } from '../config.ts';
import { planeKey } from '../data/assets.ts';
import { destinationFor, destinationRange } from '../meta/destinations.ts';
import { isHardLevel, ZEN_UNLOCK } from '../meta/progress.ts';
import { services } from '../systems/services.ts';
import { Button } from '../ui/Button.ts';
import { openDaily, openSettings } from '../ui/dialogs.ts';
import { forever } from '../ui/fx.ts';
import { canvasTex } from '../ui/gfx.ts';
import { icon } from '../ui/icons.ts';
import { NavBar, NAV_H, topBar } from '../ui/menu.ts';
import { Popup } from '../ui/Popup.ts';
import { text, UI } from '../ui/theme.ts';
import { makeTitle } from '../ui/title.ts';
import { BaseScene } from './BaseScene.ts';

/** The hub: title, current destination, the big Play button, Zen, daily gift, and the tab bar. */
export class HomeScene extends BaseScene {
  constructor() {
    super('Home');
  }

  create() {
    this.setup();
    const s = services();
    s.meta.refreshDay();
    const level = s.save.data.level;
    const { dest, index } = destinationFor(level);
    const w = view.w;
    const h = view.h;
    const wide = w > h;
    this.scenery(level, 'hero', h * (wide ? 0.7 : 0.66));
    this.ambient(wide);
    this.moodFor(level);

    const bar = topBar(this, { left: { icon: 'gear', onClick: () => openSettings(this, () => this.scene.restart()) } });

    // daily gift under the settings button
    const giftBtn = new Button(this, 80, bar.y + 130, 100, 100, { icon: 'giftColor', iconSize: 76, color: 'white', onClick: () => openDaily(this, bar.coins, () => giftBtn.setBadge(false)) }).setDepth(210);
    if (s.meta.dailyReady) {
      giftBtn.setBadge(true);
      forever(this, { targets: giftBtn, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeatDelay: 1400, ease: 'Sine.InOut' });
    }

    // title and trip card
    const titleY = wide ? h * 0.2 : h * 0.17;
    makeTitle(this, wide ? w * 0.3 : w / 2, titleY, wide ? 0.8 : Math.min(1, w / 1080));
    const cardX = wide ? w * 0.3 : w / 2;
    const cardY = wide ? h * 0.47 : titleY + 300;
    this.tripCard(cardX, cardY, level, index, dest.name);

    // play and zen
    const colX = wide ? w * 0.72 : w / 2;
    const playY = wide ? h * 0.42 : h - NAV_H - 330;
    const hard = isHardLevel(level);
    const play = new Button(this, colX, playY, Math.min(620, w - 160), 180, {
      text: `Level ${level}`,
      icon: 'play',
      size: 72,
      iconSize: 80,
      color: hard ? 'red' : 'green',
      onClick: () => this.go('Game', { mode: 'level', level }),
    }).setDepth(50);
    forever(this, { targets: play, scale: 1.04, duration: 800, yoyo: true, ease: 'Sine.InOut' });
    if (hard) {
      const tag = this.add.container(colX, playY - 110).setDepth(51);
      const g = this.add.graphics().fillStyle(0xffffff, 1).fillRoundedRect(-110, -26, 220, 52, 26).lineStyle(4, 0xff5a5f, 1).strokeRoundedRect(-110, -26, 220, 52, 26);
      tag.add([g, icon(this, -60, 0, 'flame', 34, 0xff5a5f), text(this, 16, 0, 'HARD', 32, { color: '#FF5A5F' })]);
    }
    const zenOpen = s.meta.zenUnlocked;
    const zen = new Button(this, colX, playY + 175, Math.min(460, w - 240), 118, {
      text: zenOpen ? 'Zen Mode' : `Zen at Level ${ZEN_UNLOCK + 1}`,
      icon: zenOpen ? 'leaf' : 'lock',
      size: 44,
      color: zenOpen ? 'purple' : 'dark',
      onClick: () => (zenOpen ? this.openZen() : undefined),
    }).setDepth(50);
    if (!zenOpen) zen.setEnabled(false);
    else if (!s.save.data.flags.zenSeen) zen.setBadge(true);

    new NavBar(this, 'Home');

    // first launch: say hello; zen unlock announcement
    if (zenOpen && !s.save.data.flags.zenAnnounced) {
      s.save.data.flags.zenAnnounced = true;
      s.save.save();
      this.time.delayedCall(500, () => {
        s.audio.play('unlock');
        new Popup(this, {
          title: 'Zen Mode unlocked!',
          ribbon: 'purple',
          body: 'Endless calm boards with no way to lose. Just tap, listen and relax.',
          height: 760,
          content: (c, area) => c.add(icon(this, 0, area.y + 70, 'leaf', 120, 0x8e5cf2)),
          buttons: [
            { text: 'Later', color: 'blue', onClick: () => undefined },
            { text: 'Try it', icon: 'leaf', color: 'purple', onClick: () => this.openZen() },
          ],
        });
      });
    } else if (s.meta.dailyReady && s.save.data.stats.wins > 0 && !this.registry.get('dailyShown')) {
      this.registry.set('dailyShown', true);
      this.time.delayedCall(600, () => openDaily(this, bar.coins, () => giftBtn.setBadge(false)));
    }
    this.input.keyboard?.on('keydown-ENTER', () => !this.children.list.some((o) => o instanceof Popup) && this.go('Game', { mode: 'level', level }));
  }

  /** Back on the home screen closes a popup; otherwise the app goes to the background. */
  override handleBack() {
    const p = this.topPopup();
    return p ? p.back() : false;
  }

  /** Clouds drifting by and a plane crossing the sky now and then. */
  private ambient(wide: boolean) {
    const key = canvasTex(this, 'cloud_soft', 360, 150, (ctx) => {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.ellipse(180, 100, 160, 42, 0, 0, Math.PI * 2);
      ctx.ellipse(110, 88, 74, 50, 0, 0, Math.PI * 2);
      ctx.ellipse(215, 70, 90, 62, 0, 0, Math.PI * 2);
      ctx.ellipse(160, 58, 58, 46, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    const top = wide ? 0.2 : 0.3;
    for (let i = 0; i < 3; i++) {
      const c = this.add.image(Phaser.Math.Between(0, view.w), view.h * (top + i * 0.08), key).setDepth(-5).setAlpha(0.85);
      c.setScale((0.6 + Math.random() * 0.6) / view.res);
      const drift = () => {
        if (!c.active) return;
        const speed = 18 + i * 6; // px per second
        this.tweens.add({ targets: c, x: view.w + 260, duration: ((view.w + 260 - c.x) / speed) * 1000, onComplete: () => {
          c.x = -260;
          drift();
        } });
      };
      drift();
    }
    const livery = services().save.data.cosmetics.livery;
    const fly = () => {
      if (!this.sys.isActive()) return;
      const k = planeKey(livery, 2, Phaser.Math.Between(0, 7));
      if (this.textures.exists(k)) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const y = view.h * Phaser.Math.FloatBetween(top + 0.02, top + 0.16);
        const p = this.add.image(dir > 0 ? -120 : view.w + 120, y, k).setDisplaySize(56, 112).setRotation((dir * Math.PI) / 2).setDepth(-4);
        this.tweens.add({ targets: p, x: dir > 0 ? view.w + 120 : -120, y: y - 70, duration: 8000, ease: 'Sine.InOut', onComplete: () => p.destroy() });
      }
      this.time.delayedCall(Phaser.Math.Between(6000, 11000), fly);
    };
    this.time.delayedCall(1200, fly);
  }

  private openZen() {
    const s = services();
    s.save.data.flags.zenSeen = true;
    s.save.save();
    this.go('Game', { mode: 'zen' });
  }

  private tripCard(x: number, y: number, level: number, index: number, name: string) {
    const s = services();
    const { first, last } = destinationRange(index);
    const done = level - first;
    const total = last - first + 1;
    let stars = 0;
    for (let l = first; l <= last; l++) stars += s.save.data.stars[l] ?? 0;
    const w = Math.min(700, view.w - 120);
    const c = this.add.container(x, y).setDepth(40);
    const g = this.add.graphics();
    g.fillStyle(0x0f1c3d, 0.2).fillRoundedRect(-w / 2, -86 + 8, w, 172, 40);
    g.fillStyle(0xffffff, 0.94).fillRoundedRect(-w / 2, -86, w, 172, 40);
    c.add(g);
    c.add(icon(this, -w / 2 + 70, -18, 'globe', 70, 0x3a82f0));
    c.add(text(this, -w / 2 + 130, -38, `Trip to ${name}`, 44, { color: UI.inkCss }).setOrigin(0, 0.5));
    c.add(text(this, -w / 2 + 130, 6, `Level ${Math.min(done + 1, total)} of ${total}`, 30, { color: UI.softCss, weight: 600 }).setOrigin(0, 0.5));
    c.add(icon(this, w / 2 - 120, -24, 'starGold', 52));
    c.add(text(this, w / 2 - 60, -24, String(stars), 40, { color: UI.inkCss }));
    const bw = w - 80;
    const bar = this.add.graphics();
    bar.fillStyle(0xe3eaf5, 1).fillRoundedRect(-bw / 2, 42, bw, 26, 13);
    bar.fillStyle(0x3a82f0, 1).fillRoundedRect(-bw / 2, 42, Math.max(26, (bw * done) / total), 26, 13);
    bar.fillStyle(0xffffff, 0.35).fillRoundedRect(-bw / 2 + 6, 45, Math.max(0, (bw * done) / total - 12), 8, 4);
    c.add(bar);
    c.add(icon(this, bw / 2 - 4, 55, 'plane', 44, 0xff5a5f).setAngle(45));
    c.setSize(w, 172).setInteractive({ useHandCursor: true }).on('pointerup', () => this.go('Map'));
    return c;
  }
}

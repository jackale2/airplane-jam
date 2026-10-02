import Phaser from 'phaser';
import { view } from '../config.ts';
import { BOOSTER_IDS } from '../data/tuning.ts';
import { DAILY_REWARDS, dailySlot, describeReward, type Reward } from '../meta/rewards.ts';
import { services } from '../systems/services.ts';
import type { CoinCounter } from './CoinCounter.ts';
import { forever, sparkle } from './fx.ts';
import { icon, type IconName } from './icons.ts';
import { Popup, toast } from './Popup.ts';
import { text, UI } from './theme.ts';

// Published by .github/workflows/pages.yml from docs/privacy-policy.html.
export const PRIVACY_URL = 'https://jackale2.github.io/airplane-jam/privacy-policy.html';
export const APP_VERSION = '1.0.0';

const BOOSTER_ICON: Record<string, IconName> = { extraGate: 'gate', sortQueue: 'sort', shuffleBoard: 'shuffle' };

/** Horizontal slider 0..1 with a big thumb-friendly knob. */
function slider(scene: Phaser.Scene, x: number, y: number, w: number, value: number, onChange: (v: number) => void) {
  const c = scene.add.container(x, y);
  const track = scene.add.graphics();
  const knob = scene.add.container(0, 0);
  const kg = scene.add.graphics();
  kg.fillStyle(0x1f8540, 1).fillCircle(0, 4, 30).fillStyle(0x3fca63, 1).fillCircle(0, 0, 30).fillStyle(0xffffff, 0.35).fillCircle(-8, -10, 9);
  knob.add(kg);
  const draw = (v: number) => {
    track.clear().fillStyle(0xdbe3f0, 1).fillRoundedRect(-w / 2, -12, w, 24, 12).fillStyle(0x3fca63, 1).fillRoundedRect(-w / 2, -12, Math.max(24, w * v), 24, 12);
    knob.x = -w / 2 + w * v;
  };
  draw(value);
  c.add([track, knob]);
  c.setSize(w + 60, 90).setInteractive({ useHandCursor: true, draggable: false });
  let dragging = false;
  const set = (p: Phaser.Input.Pointer) => {
    const m = c.getWorldTransformMatrix();
    const local = (p.worldX - m.tx) / m.a;
    const v = Math.min(1, Math.max(0, (local + w / 2) / w));
    draw(v);
    onChange(v);
  };
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    dragging = true;
    set(p);
  });
  const move = (p: Phaser.Input.Pointer) => dragging && p.isDown && set(p);
  const up = () => (dragging = false);
  scene.input.on('pointermove', move);
  scene.input.on('pointerup', up);
  c.once('destroy', () => {
    scene.input.off('pointermove', move);
    scene.input.off('pointerup', up);
  });
  return c;
}

/** On/off switch. */
function toggle(scene: Phaser.Scene, x: number, y: number, value: boolean, onChange: (v: boolean) => void) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  let v = value;
  const draw = () => {
    g.clear();
    g.fillStyle(v ? 0x2db353 : 0xc3cddd, 1).fillRoundedRect(-60, -32, 120, 64, 32);
    g.fillStyle(0x000000, 0.15).fillCircle(v ? 28 : -28, 3, 26);
    g.fillStyle(0xffffff, 1).fillCircle(v ? 28 : -28, 0, 26);
  };
  draw();
  c.add(g);
  c.setSize(140, 80).setInteractive({ useHandCursor: true });
  c.on('pointerup', () => {
    v = !v;
    draw();
    services().audio.play('click');
    onChange(v);
  });
  return c;
}

export function openSettings(scene: Phaser.Scene, onReset?: () => void) {
  const s = services();
  const st = s.save.data.settings;
  const w = Math.min(860, view.w - 56);
  const rowH = 108;
  const pop = new Popup(scene, {
    title: 'Settings',
    width: w,
    height: Math.min(view.h - 120, 1110),
    onClose: () => s.save.flush(),
    content: (c, area) => {
      let y = area.y + 40;
      const label = (str: string, ic: IconName) => {
        c.add(icon(scene, -w / 2 + 80, y, ic, 56, 0x5a6790));
        c.add(text(scene, -w / 2 + 130, y, str, 40, { color: UI.inkCss, weight: 600 }).setOrigin(0, 0.5));
      };
      label('Music', 'music');
      c.add(slider(scene, w / 2 - 190, y, 250, st.musicVol, (v) => {
        st.musicVol = v;
        st.music = v > 0.02;
        s.audio.syncMusic();
        s.audio.applyVolumes();
        s.save.save();
      }));
      y += rowH;
      label('Sounds', 'sound');
      c.add(slider(scene, w / 2 - 190, y, 250, st.sfxVol, (v) => {
        st.sfxVol = v;
        st.sound = v > 0.02;
        s.audio.applyVolumes();
        s.save.save();
      }));
      y += rowH;
      const toggles: [keyof typeof st, string, IconName][] = [
        ['vibration', 'Vibration', 'vibrate'],
        ['symbols', 'Color symbols', 'symbols'],
        ['reducedMotion', 'Reduced motion', 'motion'],
      ];
      for (const [key, name, ic] of toggles) {
        label(name, ic);
        c.add(toggle(scene, w / 2 - 110, y, Boolean(st[key]), (v) => {
          (st as unknown as Record<string, unknown>)[key] = v;
          s.save.save();
          if (key === 'vibration' && v) s.audio.haptic('medium');
        }));
        y += rowH;
      }
      y += 20;
      const small = (x: number, str: string, ic: IconName, fn: () => void, color: 'blue' | 'white' | 'red' = 'white') => {
        const b = new ButtonLite(scene, x, y, 240, 96, str, ic, fn, color);
        c.add(b);
      };
      small(-260, 'How to play', 'question', () => showHowTo(scene));
      small(0, 'Privacy', 'info', () => window.open(PRIVACY_URL, '_blank'));
      small(260, 'Credits', 'star', () => showCredits(scene));
      y += 130;
      small(0, 'Reset progress', 'restart', () => confirmReset(scene, onReset), 'red');
      y += 90;
      c.add(text(scene, 0, y, `Version ${APP_VERSION}`, 28, { color: UI.softCss, weight: 500 }));
    },
  });
  return pop;
}

/** Small secondary button used inside dialogs. */
class ButtonLite extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, str: string, ic: IconName, fn: () => void, color: 'blue' | 'white' | 'red') {
    super(scene, x, y);
    const fill = color === 'red' ? 0xffe3e3 : color === 'blue' ? 0xdfeaff : 0xf1f5fb;
    const edge = color === 'red' ? 0xff8a8a : 0xc8d4e8;
    const ink = color === 'red' ? '#C93A3F' : UI.inkCss;
    const g = scene.add.graphics().fillStyle(edge, 1).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 26).fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 4, 26);
    const t = text(scene, 22, -2, str, 30, { color: ink });
    if (t.width > w - 90) t.setScale((w - 90) / t.width);
    this.add([g, icon(scene, -w / 2 + 40, -2, ic, 36, color === 'red' ? 0xc93a3f : 0x5a6790), t]);
    this.setSize(w, h).setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => scene.tweens.add({ targets: this, scale: 0.94, duration: 60, yoyo: true }));
    this.on('pointerup', () => {
      services().audio.play('click');
      fn();
    });
    scene.add.existing(this);
  }
}

function confirmReset(scene: Phaser.Scene, onReset?: () => void) {
  new Popup(scene, {
    title: 'Start over?',
    ribbon: 'red',
    body: 'This deletes your levels, stars, coins and unlocks. It cannot be undone.',
    buttons: [
      { text: 'Keep playing', color: 'green', onClick: () => undefined },
      {
        text: 'Reset',
        color: 'red',
        onClick: () => {
          services().save.reset();
          services().meta.refreshDay();
          onReset?.();
        },
      },
    ],
  });
}

export function showHowTo(scene: Phaser.Scene) {
  const f = services().save.data.flags;
  delete f.tut1;
  delete f.tut2;
  delete f.tut3;
  new Popup(scene, {
    title: 'How to play',
    height: 1000,
    content: (c, area) => {
      const steps: [IconName, string][] = [
        ['plane', 'Tap a plane. If nothing blocks its nose, it taxis out to a free gate.'],
        ['person', 'Travelers board the plane that matches their color, front of the line first.'],
        ['gate', 'A full plane takes off and frees its gate. If every gate is full and nobody can board, you are stuck!'],
        ['star', 'Win without boosters for 3 stars. Every level can be solved.'],
      ];
      steps.forEach(([ic, str], i) => {
        const y = area.y + 60 + i * 170;
        c.add(icon(scene, -area.w / 2 + 60, y, ic, 72, 0x3a82f0));
        c.add(text(scene, -area.w / 2 + 120, y, str, 34, { color: UI.inkCss, weight: 600, wrap: area.w - 140, align: 'left' }).setOrigin(0, 0.5));
      });
    },
    buttons: [{ text: 'Got it!', onClick: () => undefined }],
  });
}

function showCredits(scene: Phaser.Scene) {
  new Popup(scene, {
    title: 'Credits',
    body: 'Game design, art and code: the Airplane Jam team.\n\nFont: Fredoka (SIL Open Font License).\nIcons: Kenney (CC0).\nMusic and sounds are generated live in the game.',
    buttons: [{ text: 'Close', onClick: () => undefined }],
  });
}

function rewardIcon(r: Reward): { ic: IconName; label: string } {
  if (r.coins && !r.boosters) return { ic: 'coin', label: `${r.coins}` };
  const b = BOOSTER_IDS.find((id) => r.boosters?.[id]);
  if (r.coins && b) return { ic: 'giftColor', label: 'Big box' };
  return { ic: BOOSTER_ICON[b ?? 'extraGate']!, label: `x${r.boosters?.[b ?? 'extraGate'] ?? 1}` };
}

/** The 7-day gift calendar. */
export function openDaily(scene: Phaser.Scene, coins?: CoinCounter, onClaimed?: () => void) {
  const s = services();
  const ready = s.meta.dailyReady;
  const today = ready ? dailySlot(s.save.data.daily) : (dailySlot(s.save.data.daily) + 6) % 7;
  const w = Math.min(900, view.w - 56);
  const pop = new Popup(scene, {
    title: 'Daily Gift',
    ribbon: 'purple',
    width: w,
    height: 900,
    onClose: () => undefined,
    content: (c, area) => {
      c.add(text(scene, 0, area.y + 20, ready ? 'A new gift is waiting for you!' : 'Come back tomorrow for the next gift.', 36, { color: UI.softCss, weight: 600 }));
      const cw = Math.min(180, (w - 120) / 4);
      const gap = 18;
      // four small boxes, then three with the big day-7 box last
      const widths = DAILY_REWARDS.map((_, i) => (i === 6 ? cw * 1.6 : cw));
      const pos: { x: number; y: number }[] = [];
      [[0, 1, 2, 3], [4, 5, 6]].forEach((idxs, row) => {
        const total = idxs.reduce((a, i) => a + widths[i]!, 0) + gap * (idxs.length - 1);
        let x = -total / 2;
        for (const i of idxs) {
          pos[i] = { x: x + widths[i]! / 2, y: area.y + 170 + row * (cw + 70) };
          x += widths[i]! + gap;
        }
      });
      DAILY_REWARDS.forEach((r, i) => {
        const { x, y } = pos[i]!;
        const claimed = i < today || (!ready && i === today);
        const isToday = ready && i === today;
        const bw = widths[i]!;
        const g = scene.add.graphics();
        g.fillStyle(isToday ? 0xffd447 : claimed ? 0xd9f5e0 : 0xeef3fb, 1).fillRoundedRect(x - bw / 2, y - cw / 2, bw, cw + 40, 24);
        g.lineStyle(4, isToday ? 0xe0a000 : claimed ? 0x7fd49a : 0xd3ddee, 1).strokeRoundedRect(x - bw / 2, y - cw / 2, bw, cw + 40, 24);
        c.add(g);
        c.add(text(scene, x, y - cw / 2 + 26, `Day ${i + 1}`, 26, { color: isToday ? '#6A4A00' : UI.softCss }));
        const ri = rewardIcon(r);
        const ic = icon(scene, x, y + 14, ri.ic, cw * 0.5, 0x6238c4);
        c.add(ic);
        c.add(text(scene, x, y + cw / 2 + 10, ri.label, 30, { color: UI.inkCss }));
        if (claimed) c.add(icon(scene, x + bw / 2 - 24, y - cw / 2 + 24, 'check', 40, 0x2db353));
        if (isToday) forever(scene, { targets: ic, scale: ic.scale * 1.12, yoyo: true, duration: 500, ease: 'Sine.InOut' });
      });
    },
    buttons: [
      ready
        ? {
            text: 'Claim',
            icon: 'giftColor',
            onClick: () => {
              const r = s.meta.claimDaily();
              if (!r) return;
              s.audio.play('unlock');
              sparkle(scene, view.w / 2, view.h / 2, [0xffd447, 0xffffff, 0xc59bff], 22, 420);
              if (r.coins && coins) coins.flyFrom(view.w / 2, view.h / 2, r.coins);
              else coins?.refresh();
              toast(scene, `You got ${describeReward(r)}!`, view.h * 0.25, 0x6238c4);
              onClaimed?.();
            },
          }
        : { text: 'See you tomorrow', color: 'blue', onClick: () => undefined },
    ],
  });
  return pop;
}

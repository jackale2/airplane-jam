import Phaser from 'phaser';
import { services } from '../systems/services.ts';
import { BUBBLE_MS, smoothstep } from './ease.ts';
import { text, UI } from './theme.ts';


const open = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container>();

/**
 * A small speech bubble that tells the player what is inside a reward. (x, y) is the arrow tip, which is
 * also the scale origin, so the bubble grows out of the thing that was tapped. `arrow: 'down'` puts the bubble
 * above the tip; `'up'` below it. One bubble per scene; it closes itself.
 */
export function showBubble(scene: Phaser.Scene, x: number, y: number, label: string, o: { arrow?: 'up' | 'down'; holdMs?: number; depth?: number } = {}) {
  open.get(scene)?.destroy();
  const arrow = o.arrow ?? 'down';
  const t = text(scene, 0, 0, label, 34, { color: UI.inkCss, align: 'center', weight: 600, wrap: 520 });
  const w = Math.max(160, t.width + 64);
  const h = t.height + 40;
  const dir = arrow === 'down' ? -1 : 1; // bubble sits above (-) or below (+) the tip
  const cy = dir * (h / 2 + 22);
  t.setY(cy);
  const g = scene.add.graphics();
  g.fillStyle(0x0f1c3d, 0.18).fillRoundedRect(-w / 2, cy - h / 2 + 6, w, h, 22);
  g.fillStyle(0xffffff, 1).lineStyle(5, 0x3a82f0, 1).fillRoundedRect(-w / 2, cy - h / 2, w, h, 22).strokeRoundedRect(-w / 2, cy - h / 2, w, h, 22);
  g.fillStyle(0xffffff, 1).fillTriangle(-16, dir * 4, 16, dir * 4, 0, 0).fillTriangle(-16, dir * 22, 16, dir * 22, 0, 0);
  const c = scene.add.container(x, y, [g, t]).setDepth(o.depth ?? 1100);
  open.set(scene, c);
  c.once('destroy', () => open.get(scene) === c && open.delete(scene));
  if (services().save.data.settings.reducedMotion) c.setScale(1);
  else {
    c.setScale(0);
    scene.tweens.add({ targets: c, scale: 1, duration: BUBBLE_MS, ease: smoothstep });
  }
  scene.time.delayedCall(o.holdMs ?? 2200, () => {
    if (!c.active) return;
    scene.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
  });
  return c;
}

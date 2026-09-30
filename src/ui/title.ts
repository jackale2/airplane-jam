import type Phaser from 'phaser';
import { icon } from './icons.ts';
import { text } from './theme.ts';

/** The game title: chunky white and red lettering with a little plane, gently bobbing. */
export function makeTitle(scene: Phaser.Scene, x: number, y: number, scale = 1) {
  const a = text(scene, 0, -58, 'AIRPLANE', 132, { color: '#FFFFFF', stroke: '#1B2A52', strokeW: 22, shadow: true });
  const b = text(scene, 0, 72, 'JAM', 168, { color: '#FF5A5F', stroke: '#1B2A52', strokeW: 24, shadow: true });
  const p = icon(scene, a.width / 2 + 10, -150, 'plane', 110, 0xffffff);
  const c = scene.add.container(x, y, [a, b, p]).setScale(scale);
  scene.tweens.add({ targets: c, y: y - 12, duration: 1800, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
  scene.tweens.add({ targets: p, x: p.x + 16, y: p.y - 10, angle: 8, duration: 1300, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
  return c;
}

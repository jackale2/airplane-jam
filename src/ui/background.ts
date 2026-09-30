import type Phaser from 'phaser';
import { H, W } from '../config.ts';

/** Sky, clouds, control tower, terminal and runway, drawn once into a texture (cheap to render every frame). */
export function makeBackgroundTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('bg')) return;
  const g = scene.make.graphics({}, false);
  g.fillGradientStyle(0x7fc8f2, 0x7fc8f2, 0xdaf1fc, 0xdaf1fc, 1).fillRect(0, 0, W, H * 0.78);

  // clouds
  g.fillStyle(0xffffff, 0.75);
  for (const [x, y, s] of [[160, 300, 1], [820, 210, 1.2], [560, 560, 0.8], [940, 720, 1], [90, 900, 0.9]] as const) {
    g.fillEllipse(x, y, 220 * s, 70 * s).fillEllipse(x - 60 * s, y + 10 * s, 130 * s, 60 * s).fillEllipse(x + 70 * s, y + 8 * s, 150 * s, 55 * s);
  }

  // airport buildings, left and right of the board
  const skyline = (x: number, w: number, top: number, color: number, win: number) => {
    g.fillStyle(color, 1).fillRect(x, top, w, H * 0.78 - top);
    g.fillStyle(win, 0.85);
    for (let wy = top + 30; wy < H * 0.78 - 40; wy += 50) for (let wx = x + 14; wx < x + w - 20; wx += 44) g.fillRect(wx, wy, 28, 24);
  };
  skyline(0, 190, H * 0.5, 0x9cb8d6, 0xd9ecfa); // terminal (left)
  skyline(W - 200, 200, H * 0.56, 0xa9c1dc, 0xd9ecfa); // terminal (right)
  g.fillStyle(0x8fa8c8, 1).fillRect(52, H * 0.34, 46, H * 0.16); // tower shaft
  g.fillStyle(0x6e8bb0, 1).fillRoundedRect(20, H * 0.31, 110, 60, 14); // tower cab
  g.fillStyle(0xd9ecfa, 0.9).fillRect(34, H * 0.31 + 14, 82, 26);
  g.fillStyle(0xffffff, 1).fillEllipse(W - 30, H * 0.66, 260, 120); // parked plane nose peeking in
  g.fillStyle(0x6e8bb0, 1).fillEllipse(W - 78, H * 0.655, 60, 26);

  // apron and runway
  g.fillGradientStyle(0x9aa7ba, 0x9aa7ba, 0x7d8aa0, 0x7d8aa0, 1).fillRect(0, H * 0.78, W, H * 0.22);
  g.fillStyle(0xffffff, 0.6);
  for (let x = 40; x < W; x += 160) g.fillRect(x, H * 0.86, 90, 10);
  g.fillStyle(0xffc928, 0.7);
  for (let x = 100; x < W; x += 260) g.fillRect(x, H * 0.94, 120, 14);

  g.generateTexture('bg', W, H);
  g.destroy();
}

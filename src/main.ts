import Phaser from 'phaser';
import { setView, view } from './config.ts';
import { sameView, viewFor } from './layout/view.ts';
import { BootScene } from './scenes/BootScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { HomeScene } from './scenes/HomeScene.ts';
import { MapScene } from './scenes/MapScene.ts';
import { PreloadScene } from './scenes/PreloadScene.ts';
import { ShopScene } from './scenes/ShopScene.ts';
import { TrophiesScene } from './scenes/TrophiesScene.ts';
import { registerServiceWorker } from './systems/pwa.ts';

const parent = document.getElementById('game')!;
const measure = () => viewFor(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight);
setView(measure());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: view.w * view.res,
  height: view.h * view.res,
  backgroundColor: '#6ec8f5',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { powerPreference: 'high-performance', antialias: true, roundPixels: false },
  disableContextMenu: true,
  input: { activePointers: 2 },
  scene: [BootScene, PreloadScene, HomeScene, MapScene, GameScene, ShopScene, TrophiesScene],
});

// A new window shape (rotation, split screen, desktop resize) re-lays the scenes out; small changes
// such as a mobile address bar sliding away are absorbed by FIT scaling.
let timer: ReturnType<typeof setTimeout> | undefined;
const onResize = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const v = measure();
    if (sameView(v, view)) return;
    setView(v);
    game.scale.setGameSize(v.w * view.res, v.h * view.res);
    game.events.emit('relayout');
  }, 160);
};
window.addEventListener('resize', onResize);
window.visualViewport?.addEventListener('resize', onResize);
screen.orientation?.addEventListener?.('change', onResize);

registerServiceWorker();

if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game; // dev-only handle for tests and debugging

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
import { services } from './systems/services.ts';

const parent = document.getElementById('game')!;
const measure = () => viewFor(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight);
setView(measure());

// dev only: ?renderer=canvas forces the 2D canvas renderer (much faster in headless test browsers)
const forceCanvas = import.meta.env.DEV && new URLSearchParams(location.search).get('renderer') === 'canvas';

// A slightly larger audio buffer than the default "interactive" one: busy phones stop crackling and
// the music never runs dry, while taps still sound instant.
const audioContext = (() => {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return AC ? new AC({ latencyHint: 'balanced' }) : undefined;
  } catch {
    return undefined;
  }
})();

const game = new Phaser.Game({
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent,
  width: view.w * view.res,
  height: view.h * view.res,
  backgroundColor: '#6ec8f5',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { powerPreference: 'high-performance', antialias: true, roundPixels: false },
  disableContextMenu: true,
  input: { activePointers: 2 },
  audio: audioContext ? { context: audioContext } : {},
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

// Android back button (see MainActivity.java): the active scene decides; false lets the app go to the background.
(window as unknown as { __onBack: () => boolean }).__onBack = () => {
  const s = game.scene.getScenes(true)[0] as (Phaser.Scene & { handleBack?: () => boolean }) | undefined;
  try {
    return s?.handleBack?.() ?? false;
  } catch {
    return false;
  }
};

registerServiceWorker();

if (import.meta.env.DEV) Object.assign(window, { __game: game, __services: services }); // dev-only handles for tests and debugging

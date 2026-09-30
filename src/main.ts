import Phaser from 'phaser';
import { H, W } from './config.ts';
import { BootScene } from './scenes/BootScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { PreloadScene } from './scenes/PreloadScene.ts';
import { SettingsScene } from './scenes/SettingsScene.ts';
import { ShopScene } from './scenes/ShopScene.ts';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#9fd7ee',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 1 },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, ShopScene, SettingsScene],
});

if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game; // dev-only handle for debugging

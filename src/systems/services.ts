import type Phaser from 'phaser';
import { AdsManager } from './AdsManager.ts';
import { AudioManager } from './AudioManager.ts';
import { CloudSave } from './CloudSave.ts';
import { EconomyManager } from './EconomyManager.ts';
import { IapManager } from './IapManager.ts';
import { MetaManager } from './MetaManager.ts';
import { SaveManager } from './SaveManager.ts';

/** App-wide singletons, created once in Boot. */
export interface Services {
  save: SaveManager;
  economy: EconomyManager;
  meta: MetaManager;
  audio: AudioManager;
  ads: AdsManager;
  iap: IapManager;
  cloud: CloudSave;
}

let s: Services | undefined;

export async function initServices(game: Phaser.Game): Promise<Services> {
  const save = new SaveManager();
  await save.load();
  const economy = new EconomyManager(save);
  if (import.meta.env.DEV) {
    // dev flags: ?fresh starts a new save, ?coins=500 sets the balance, ?level=40 unlocks up to that level
    // (never in a production build)
    const q = new URLSearchParams(location.search);
    if (q.has('fresh')) save.data = (await import('./SaveManager.ts')).defaultSave();
    const coins = Number(q.get('coins'));
    if (Number.isFinite(coins) && coins > 0) save.data.coins = Math.floor(coins);
    const level = Number(q.get('level'));
    if (Number.isFinite(level) && level > 0) save.data.level = Math.floor(level);
    save.save();
  }
  const meta = new MetaManager(save, economy);
  meta.refreshDay();
  const cloud = new CloudSave(save);
  save.onFlush = () => cloud.markDirty();
  cloud.onRestored = () => {
    meta.refreshDay();
    // a menu already on screen redraws with the restored progress (a level in play just carries on)
    const sc = game.scene.getScenes(true)[0];
    if (sc && ['Home', 'Map', 'Shop', 'Trophies'].includes(sc.scene.key)) sc.scene.restart();
  };
  s = { save, economy, meta, audio: new AudioManager(game, save), ads: new AdsManager(save), iap: new IapManager(save, economy), cloud };
  // write the save (and its cloud backup) before the app is closed or sent to the background
  const flush = () => {
    save.flush();
    void cloud.push();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  return s;
}

export const services = (): Services => s!;

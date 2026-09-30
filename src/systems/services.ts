import type Phaser from 'phaser';
import { AdsManager } from './AdsManager.ts';
import { AudioManager } from './AudioManager.ts';
import { EconomyManager } from './EconomyManager.ts';
import { IapManager } from './IapManager.ts';
import { SaveManager } from './SaveManager.ts';

/** App-wide singletons, created once in Boot. */
export interface Services {
  save: SaveManager;
  economy: EconomyManager;
  audio: AudioManager;
  ads: AdsManager;
  iap: IapManager;
}

let s: Services | undefined;

export async function initServices(game: Phaser.Game): Promise<Services> {
  const save = new SaveManager();
  await save.load();
  const economy = new EconomyManager(save);
  s = { save, economy, audio: new AudioManager(game, save.data.settings), ads: new AdsManager(save), iap: new IapManager(save, economy) };
  return s;
}

export const services = (): Services => s!;

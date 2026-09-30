import type Phaser from 'phaser';
import { view } from '../config.ts';
import { outfitKey, outfitPath, PLANE_SVG_SCALE, planeKey, planePath, planeShadowKey, TRAVELER_SVG_SCALE, TRAVELERS, travelerKey, travelerPath } from '../data/assets.ts';
import { OUTFITS } from '../meta/cosmetics.ts';

const LENGTHS = [2, 3, 4] as const;
const planeScale = () => Math.min(2.7, PLANE_SVG_SCALE * view.res);
const travelerScale = () => Math.min(1.9, TRAVELER_SVG_SCALE * Math.min(view.res, 1.5));

/** Queue every plane of a livery that is not loaded yet. Returns true if anything was queued. */
export function queueLivery(scene: Phaser.Scene, livery: string) {
  let any = false;
  for (const len of LENGTHS) {
    for (let c = 0; c < 8; c++) {
      const key = planeKey(livery, len, c);
      if (scene.textures.exists(key)) continue;
      scene.load.svg(key, planePath(livery, len, c), { scale: planeScale() });
      any = true;
    }
  }
  return any;
}

export function queueTravelers(scene: Phaser.Scene) {
  for (let ch = 0; ch < TRAVELERS; ch++) {
    for (let c = 0; c < 8; c++) {
      const key = travelerKey(ch, c);
      if (!scene.textures.exists(key)) scene.load.svg(key, travelerPath(ch, c), { scale: travelerScale() });
    }
  }
  for (const o of OUTFITS) {
    if (o !== 'casual' && !scene.textures.exists(outfitKey(o))) scene.load.svg(outfitKey(o), outfitPath(o), { scale: travelerScale() });
  }
}

/** Soft blurred silhouettes (one per livery and length) drawn under planes. */
export function makePlaneShadows(scene: Phaser.Scene, livery: string) {
  for (const len of LENGTHS) {
    const key = planeShadowKey(livery, len);
    const srcKey = planeKey(livery, len, 0);
    if (scene.textures.exists(key) || !scene.textures.exists(srcKey)) continue;
    const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const pad = Math.ceil(src.width * 0.14);
    const tex = scene.textures.createCanvas(key, src.width + pad * 2, src.height + pad * 2);
    if (!tex) continue;
    const ctx = tex.context;
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = src.width * 0.07;
    ctx.shadowOffsetX = 10000;
    ctx.drawImage(src, pad - 10000, pad);
    tex.refresh();
  }
}

/** Make sure a livery is ready to draw (loads it if needed). */
export function ensureLivery(scene: Phaser.Scene, livery: string): Promise<void> {
  return new Promise((resolve) => {
    if (!queueLivery(scene, livery)) {
      makePlaneShadows(scene, livery);
      resolve();
      return;
    }
    scene.load.once('complete', () => {
      makePlaneShadows(scene, livery);
      resolve();
    });
    scene.load.start();
  });
}

/** Display size of a shadow texture relative to its plane's display width. */
export function shadowScale(scene: Phaser.Scene, livery: string, len: number, planeW: number) {
  const src = scene.textures.get(planeKey(livery, len, 0)).getSourceImage() as { width: number };
  return planeW / src.width;
}

import { describe, expect, it } from 'vitest';
import { CloudSave, isAhead, merge } from '../systems/CloudSave.ts';
import { defaultSave, SaveManager } from '../systems/SaveManager.ts';

const at = (level: number, stars: Record<string, number> = {}, wins = 0) => {
  const d = defaultSave();
  d.level = level;
  d.stars = stars;
  d.stats.wins = wins;
  return d;
};

describe('cloud save merge', () => {
  it('compares progress by level, then stars, then wins', () => {
    expect(isAhead(at(5), at(4))).toBe(true);
    expect(isAhead(at(4), at(5))).toBe(false);
    expect(isAhead(at(5, { 1: 3 }), at(5, { 1: 2 }))).toBe(true);
    expect(isAhead(at(5, {}, 9), at(5, {}, 8))).toBe(true);
    expect(isAhead(at(5), at(5))).toBe(false);
  });

  it('restores a cloud save that is further along, keeping this device settings', () => {
    const local = at(1);
    local.settings.musicVol = 0.1;
    const cloud = at(30, { 1: 3, 2: 3 });
    cloud.settings.musicVol = 0.9;
    const r = merge(local, cloud);
    expect(r.use?.level).toBe(30);
    expect(r.use?.settings.musicVol).toBe(0.1);
    expect(r.upload).toBe(false);
  });

  it('uploads when there is no cloud save or this device is ahead, and does nothing when equal', () => {
    expect(merge(at(3), null)).toEqual({ use: null, upload: true });
    expect(merge(at(9), at(3))).toEqual({ use: null, upload: true });
    expect(merge(at(3), at(3))).toEqual({ use: null, upload: false });
  });

  it('is a no-op outside Android', async () => {
    const cloud = new CloudSave(new SaveManager());
    expect(cloud.supported).toBe(false);
    expect(await cloud.start()).toBe(false);
    cloud.markDirty();
    await cloud.push(true);
    expect((await cloud.signIn()).signedIn).toBe(false);
  });
});

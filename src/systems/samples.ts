import type { Sfx } from './AudioManager.ts';

/**
 * Original sound clips (from the studied game, see CREDITS.md) layered over the synthesized sounds.
 * A clip that is missing or fails to decode is skipped and the synth plays instead, so deleting
 * public/assets/sfx restores the pure synth sound.
 */
export const SAMPLES: Partial<Record<Sfx | 'board', { file: string; gain: number }>> = {
  click: { file: 'ui_click', gain: 0.7 },
  popup: { file: 'window_open', gain: 0.6 },
  coin: { file: 'ui_getcoin', gain: 0.6 },
  win: { file: 'level_win', gain: 0.8 },
  fail: { file: 'game_lose', gain: 0.7 },
  star: { file: 'star_increase', gain: 0.7 },
  unlock: { file: 'ui_claim_reward', gain: 0.7 },
  shuffle: { file: 'shuffle', gain: 0.6 },
  takeoff: { file: 'vehicle_full', gain: 0.6 },
  board: { file: 'passenger_geton', gain: 0.8 }, // pitched along the music's scale by the caller
};

export async function loadSamples(c: AudioContext) {
  const out = new Map<string, AudioBuffer>();
  await Promise.all(
    [...new Set(Object.values(SAMPLES).map((s) => s!.file))].map(async (f) => {
      try {
        const res = await fetch(`assets/sfx/${f}.wav`);
        if (res.ok) out.set(f, await c.decodeAudioData(await res.arrayBuffer()));
      } catch {
        /* missing clip: the synth covers it */
      }
    }),
  );
  return out;
}

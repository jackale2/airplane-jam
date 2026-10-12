import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptic table ported from the studied game (docs/COMPETITOR_TEARDOWN.md, section 3): many short pulses with
 * their own strength. `effect` is Android's predefined effect id (-1 = none), `amplitude` 1..255, `ms` the
 * pulse length, `ios` a 0..4 strength.
 */
export interface HapticRow {
  effect: number;
  amplitude: number;
  ms: number;
  ios: number;
}

export const HAPTIC_ROWS: Record<number, HapticRow> = {
  1: { effect: 0, amplitude: 120, ms: 20, ios: 2 }, // CLICK
  // rows 2 and 5 are softened on purpose (theirs: HEAVY_CLICK / ios 4): boarding and coins chain many times a second
  2: { effect: -1, amplitude: 30, ms: 10, ios: 1 },
  3: { effect: 0, amplitude: 120, ms: 20, ios: 2 },
  4: { effect: -1, amplitude: 200, ms: 50, ios: 0 },
  5: { effect: -1, amplitude: 30, ms: 10, ios: 1 },
  6: { effect: -1, amplitude: 80, ms: 20, ios: 1 }, // their predefined id 3 does not exist on Android: one-shot only
  7: { effect: 1, amplitude: 150, ms: 30, ios: 2 }, // DOUBLE_CLICK
  8: { effect: 1, amplitude: 80, ms: 20, ios: 2 },
  9: { effect: 0, amplitude: 120, ms: 20, ios: 3 },
};

/** Game event -> table row. */
export const HAPTIC_EVENTS = {
  button: 1,
  board: 2, // a traveler hops aboard
  tap: 3, // a plane taxis out
  win: 4,
  lose: 4,
  coin: 5, // coins fly to the counter
  bump: 6, // a blocked plane
  park: 9, // a plane reaches its gate
  chest: 6,
} as const;

/** A full plane: three short pulses (30 on, 45 off, 30 on, 45 off, 30 on). */
export const FULL_PATTERN = { timings: [0, 30, 45, 30, 45, 30], amplitudes: [0, 180, 0, 180, 0, 180] };

export type Haptic = keyof typeof HAPTIC_EVENTS | 'full';

/** Same event never fires twice inside this window (boarding can chain quickly). */
export const HAPTIC_MIN_GAP_MS: Partial<Record<Haptic, number>> = { board: 45 };

export const hapticRow = (kind: Exclude<Haptic, 'full'>): HapticRow => HAPTIC_ROWS[HAPTIC_EVENTS[kind]]!;

interface AmplitudeHapticsPlugin {
  play(o: { ms: number; amplitude: number; effect: number }): Promise<void>;
  pattern(o: { timings: number[]; amplitudes: number[] }): Promise<void>;
}
const native = Capacitor.getPlatform() === 'android' ? registerPlugin<AmplitudeHapticsPlugin>('AmplitudeHaptics') : undefined;

/** Fire one haptic. Never throws: haptics are best-effort. */
export function fireHaptic(kind: Haptic) {
  try {
    if (kind === 'full') {
      if (native) void native.pattern(FULL_PATTERN).catch(() => webBuzz(FULL_PATTERN.timings.slice(1)));
      else if (Capacitor.getPlatform() === 'ios') void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      else webBuzz(FULL_PATTERN.timings.slice(1));
      return;
    }
    const row = hapticRow(kind);
    if (native) void native.play({ ms: row.ms, amplitude: row.amplitude, effect: row.effect }).catch(() => webBuzz(row.ms));
    else if (Capacitor.getPlatform() === 'ios') void iosPulse(kind, row).catch(() => undefined);
    else webBuzz(row.ms);
  } catch {
    /* no vibration support */
  }
}

const iosPulse = (kind: Exclude<Haptic, 'full'>, row: HapticRow) =>
  row.ios === 0
    ? Haptics.notification({ type: kind === 'lose' ? NotificationType.Warning : NotificationType.Success })
    : Haptics.impact({ style: row.ios <= 1 ? ImpactStyle.Light : row.ios === 2 ? ImpactStyle.Medium : ImpactStyle.Heavy });

const webBuzz = (p: number | number[]) => navigator.vibrate?.(p);

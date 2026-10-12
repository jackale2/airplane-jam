/** The studied game's reward bubble pops in with a cubic ease-in-out (smoothstep) over 0.267 s. */
export const BUBBLE_MS = 267;
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

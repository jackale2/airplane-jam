/** The world tour: every 20 levels the player flies on to a new destination with its own scenery and music. */
export const LEVELS_PER_DESTINATION = 20;

export type Landmark = 'harbor' | 'eiffel' | 'fuji' | 'pyramids' | 'skyline' | 'sugarloaf' | 'clocktower' | 'windmills' | 'aurora' | 'savanna';

export interface Destination {
  name: string;
  tagline: string;
  landmark: Landmark;
  /** Sky gradient top and bottom, far hills, near ground, accent. */
  sky: [number, number];
  hills: number;
  ground: number;
  accent: number;
  /** Music mood: root note (MIDI) and scale flavour. */
  music: { root: number; flavour: 'major' | 'lydian' | 'dorian' | 'mixolydian' };
}

export const DESTINATIONS: Destination[] = [
  { name: 'Sunny Harbor', tagline: 'Your home airport by the sea', landmark: 'harbor', sky: [0x6ec8f5, 0xd4f1ff], hills: 0x9fd9b8, ground: 0xf4e3b5, accent: 0xff7a59, music: { root: 60, flavour: 'major' } },
  { name: 'Paris', tagline: 'Croissants and city lights', landmark: 'eiffel', sky: [0x8fb8f0, 0xf6e1f0], hills: 0xc5d3ea, ground: 0xe9dcc9, accent: 0xe86a92, music: { root: 62, flavour: 'lydian' } },
  { name: 'Tokyo', tagline: 'Cherry blossoms and bullet trains', landmark: 'fuji', sky: [0x9ad0f5, 0xffe6ef], hills: 0xb8c9e8, ground: 0xf2d5de, accent: 0xff8fb1, music: { root: 57, flavour: 'major' } },
  { name: 'Cairo', tagline: 'Pyramids at golden hour', landmark: 'pyramids', sky: [0xf9c784, 0xfff0d2], hills: 0xeec07a, ground: 0xf6dca3, accent: 0xe07a3c, music: { root: 59, flavour: 'dorian' } },
  { name: 'New York', tagline: 'The city that never sleeps', landmark: 'skyline', sky: [0x79b6ef, 0xdcebfb], hills: 0x9fb4d3, ground: 0xd2dbe6, accent: 0xffb13b, music: { root: 61, flavour: 'mixolydian' } },
  { name: 'Rio', tagline: 'Sunny beaches and samba', landmark: 'sugarloaf', sky: [0x5fc6e8, 0xd7f6ef], hills: 0x69c08b, ground: 0xf7e2a8, accent: 0xffc93c, music: { root: 64, flavour: 'major' } },
  { name: 'London', tagline: 'Tea time by the river', landmark: 'clocktower', sky: [0x9bb7d6, 0xe8eef6], hills: 0xa9bccf, ground: 0xd8dde3, accent: 0xd94a4a, music: { root: 58, flavour: 'dorian' } },
  { name: 'Amsterdam', tagline: 'Windmills and tulip fields', landmark: 'windmills', sky: [0x7cc3f2, 0xe2f3ff], hills: 0x9ad28d, ground: 0xf3a6b8, accent: 0xff6f91, music: { root: 63, flavour: 'lydian' } },
  { name: 'Reykjavik', tagline: 'Dancing northern lights', landmark: 'aurora', sky: [0x243b73, 0x5a7fb8], hills: 0xdfe9f5, ground: 0xf1f6fb, accent: 0x6ff0c3, music: { root: 55, flavour: 'lydian' } },
  { name: 'Nairobi', tagline: 'Sunsets on the savanna', landmark: 'savanna', sky: [0xffa46b, 0xffe2a8], hills: 0xd79a5b, ground: 0xe8c07d, accent: 0xff7a3d, music: { root: 60, flavour: 'mixolydian' } },
];

/** 0-based index along the endless tour (wraps round the list, one lap per "tour"). */
export function destinationIndex(level: number) {
  return Math.floor((Math.max(1, level) - 1) / LEVELS_PER_DESTINATION);
}

export function destinationFor(level: number) {
  const i = destinationIndex(level);
  return { index: i, tour: Math.floor(i / DESTINATIONS.length) + 1, dest: DESTINATIONS[i % DESTINATIONS.length]! };
}

/** First and last level of the destination at tour index `i`. */
export function destinationRange(i: number) {
  return { first: i * LEVELS_PER_DESTINATION + 1, last: (i + 1) * LEVELS_PER_DESTINATION };
}

/** Destinations reached so far (the current one counts). */
export function destinationsReached(level: number) {
  return destinationIndex(level) + 1;
}

/** Things coins can buy besides boosters. Everything is cosmetic: it never changes difficulty. */
export type CosmeticKind = 'livery' | 'outfit' | 'theme';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  name: string;
  price: number;
  blurb: string;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'classic', kind: 'livery', name: 'Classic', price: 0, blurb: 'Glossy airliners' },
  { id: 'racer', kind: 'livery', name: 'Racer', price: 600, blurb: 'Speedy white stripes' },
  { id: 'polka', kind: 'livery', name: 'Polka Dot', price: 1200, blurb: 'Dots and a star tail' },
  { id: 'prop', kind: 'livery', name: 'Propeller', price: 2000, blurb: 'Retro prop planes' },
  { id: 'jumbo', kind: 'livery', name: 'Jumbo', price: 3000, blurb: 'Double-decker giants' },

  { id: 'casual', kind: 'outfit', name: 'Casual', price: 0, blurb: 'Comfy travel clothes' },
  { id: 'party', kind: 'outfit', name: 'Party Hats', price: 500, blurb: 'Every flight is a party' },
  { id: 'beach', kind: 'outfit', name: 'Beach Day', price: 1000, blurb: 'Sun hats and shades' },
  { id: 'winter', kind: 'outfit', name: 'Cozy Winter', price: 1500, blurb: 'Bobble hats for everyone' },
  { id: 'royal', kind: 'outfit', name: 'Royalty', price: 2500, blurb: 'Crowns, naturally' },

  { id: 'day', kind: 'theme', name: 'Sunny Day', price: 0, blurb: 'Blue skies' },
  { id: 'sunset', kind: 'theme', name: 'Golden Hour', price: 800, blurb: 'Warm evening light' },
  { id: 'night', kind: 'theme', name: 'Starry Night', price: 1500, blurb: 'Runway lights and stars' },
  { id: 'snow', kind: 'theme', name: 'Snowfall', price: 2000, blurb: 'Gentle falling snow' },
  { id: 'candy', kind: 'theme', name: 'Cotton Candy', price: 2500, blurb: 'Pastel dreamland' },
];

export const DEFAULT_COSMETICS = { livery: 'classic', outfit: 'casual', theme: 'day' } as const;

export const cosmeticsOf = (kind: CosmeticKind) => COSMETICS.filter((c) => c.kind === kind);
export const cosmetic = (id: string) => COSMETICS.find((c) => c.id === id);
export const LIVERIES = cosmeticsOf('livery').map((c) => c.id);
export const OUTFITS = cosmeticsOf('outfit').map((c) => c.id);
export const THEMES = cosmeticsOf('theme').map((c) => c.id);

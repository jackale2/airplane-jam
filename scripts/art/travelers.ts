// Cute chibi travelers, facing the viewer. viewBox 0 -20 100 140: the head sits at (50, 38), feet at y 116,
// and the 20 units above the head leave room for hats (outfit overlays share the same viewBox).
// The shirt carries the passenger color; everything else is neutral so colors never get mixed up.
import { deep, shade } from './color.ts';

type Hair = 'short' | 'long' | 'bun' | 'afro' | 'pigtails' | 'spiky' | 'grandpa' | 'ponytail';
type Carry = 'suitcase' | 'backpack' | 'handbag' | 'teddy';

interface Character {
  name: string;
  skin: string;
  hair: Hair;
  hairColor: string;
  carry: Carry;
  carryColor: string;
  pants: string;
}

export const CHARACTERS: Character[] = [
  { name: 'Leo', skin: 'F2C9A0', hair: 'short', hairColor: '6B4226', carry: 'suitcase', carryColor: 'C8A27A', pants: '3E5C8A' },
  { name: 'Mia', skin: 'E0A878', hair: 'long', hairColor: '2B2230', carry: 'backpack', carryColor: '7C8594', pants: '3A3F58' },
  { name: 'Ava', skin: 'FAD7B5', hair: 'bun', hairColor: 'E3B85A', carry: 'handbag', carryColor: '8B5E3C', pants: '4A4E69' },
  { name: 'Kai', skin: '8D5A3B', hair: 'afro', hairColor: '1F1A1A', carry: 'suitcase', carryColor: '8A95A8', pants: '3E5C8A' },
  { name: 'Zoe', skin: 'F6CFAE', hair: 'pigtails', hairColor: 'A0482B', carry: 'teddy', carryColor: 'C89B6D', pants: '4A4E69' },
  { name: 'Ravi', skin: 'B97A4F', hair: 'spiky', hairColor: '262626', carry: 'backpack', carryColor: 'B59A74', pants: '2F3446' },
  { name: 'Walt', skin: 'F1C6A1', hair: 'grandpa', hairColor: 'C7CDD4', carry: 'suitcase', carryColor: '6E5A4C', pants: '5A5F73' },
  { name: 'Nia', skin: '6F4431', hair: 'ponytail', hairColor: '2E211A', carry: 'handbag', carryColor: 'A8A29A', pants: '3A3F58' },
];

/** How far (viewBox units, negative is up) a hat must move for tall hair. */
export const HAT_DY = [0, -1, -7, -9, 0, -4, 1, 0];

const EYE = '#2B2233';

function hairBack(c: Character) {
  const h = `#${c.hairColor}`;
  const o = `stroke="${deep(c.hairColor, -0.45)}" stroke-width="2" stroke-linejoin="round"`;
  switch (c.hair) {
    case 'long':
      return `<path d="M25,38 C24,16 38,11 50,11 C63,11 76,16 75,38 L77,70 Q71,75 64,70 L63,52 L37,52 L36,70 Q29,75 23,70 Z" fill="${h}" ${o}/>`;
    case 'afro':
      return `<g fill="${h}" ${o}><circle cx="30" cy="34" r="13"/><circle cx="70" cy="34" r="13"/><circle cx="36" cy="17" r="14"/><circle cx="64" cy="17" r="14"/><circle cx="50" cy="10" r="15"/><circle cx="26" cy="47" r="9"/><circle cx="74" cy="47" r="9"/></g>`;
    case 'pigtails':
      return `<g fill="${h}" ${o}><ellipse cx="21" cy="50" rx="8" ry="13" transform="rotate(18 21 50)"/><ellipse cx="79" cy="50" rx="8" ry="13" transform="rotate(-18 79 50)"/></g><circle cx="25" cy="39" r="3.2" fill="#FFFFFF" stroke="#C9C2CF" stroke-width="1.2"/><circle cx="75" cy="39" r="3.2" fill="#FFFFFF" stroke="#C9C2CF" stroke-width="1.2"/>`;
    case 'bun':
      return `<circle cx="50" cy="10" r="10" fill="${h}" ${o}/>`;
    case 'ponytail':
      return `<ellipse cx="77" cy="46" rx="8" ry="15" fill="${h}" ${o} transform="rotate(-24 77 46)"/>`;
    default:
      return '';
  }
}

function hairFront(c: Character) {
  const h = `#${c.hairColor}`;
  const o = `stroke="${deep(c.hairColor, -0.45)}" stroke-width="2" stroke-linejoin="round"`;
  const hi = shade(c.hairColor, 0.25);
  switch (c.hair) {
    case 'short':
      return `<path d="M27,41 C25,20 37,12 50,12 C64,12 76,20 73,41 C71,33 66,28 58,27 C52,31 41,31 33,28 C30,32 28,36 27,41 Z" fill="${h}" ${o}/><path d="M38,18 Q46,14 54,15" stroke="${hi}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.8"/>`;
    case 'long':
      return `<path d="M27,39 C27,18 40,12 50,12 C62,12 73,18 73,39 C67,30 59,24 50,26 C45,29 36,31 27,39 Z" fill="${h}" ${o}/>`;
    case 'bun':
      return `<path d="M27,39 C26,20 38,14 50,14 C62,14 74,20 73,39 C66,29 58,25 50,25 C42,25 34,29 27,39 Z" fill="${h}" ${o}/><path d="M40,19 Q47,16 54,17" stroke="${hi}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.8"/>`;
    case 'afro':
      return `<path d="M29,34 Q33,24 41,26 Q46,20 52,24 Q58,19 63,25 Q70,24 71,34 Q64,30 57,31 Q50,28 43,31 Q36,29 29,34 Z" fill="${h}" ${o}/>`;
    case 'pigtails':
      return `<path d="M27,40 C26,19 38,12 50,12 C63,12 74,19 73,40 C69,31 62,26 54,27 L52,31 L49,27 C41,26 31,31 27,40 Z" fill="${h}" ${o}/>`;
    case 'spiky':
      return `<path d="M27,40 L29,21 L35,26 L38,11 L45,21 L51,7 L56,20 L63,10 L65,24 L72,19 L73,40 C67,31 59,28 50,29 C41,28 33,31 27,40 Z" fill="${h}" ${o}/>`;
    case 'grandpa':
      return `<g fill="${h}" ${o}><path d="M26,44 C23,34 27,27 34,26 C32,31 31,37 32,44 Z"/><path d="M74,44 C77,34 73,27 66,26 C68,31 69,37 68,44 Z"/></g><ellipse cx="44" cy="21" rx="7" ry="3.2" fill="#FFFFFF" opacity="0.45"/>`;
    case 'ponytail':
      return `<path d="M27,40 C26,19 38,12 50,12 C63,12 74,19 73,40 C68,31 60,26 50,26 C41,26 32,31 27,40 Z" fill="${h}" ${o}/><path d="M29,30 Q50,18 71,30" stroke="#FFFFFF" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  }
}

function face(c: Character) {
  let f =
    `<ellipse cx="41.5" cy="40" rx="3.4" ry="4.3" fill="${EYE}"/><ellipse cx="58.5" cy="40" rx="3.4" ry="4.3" fill="${EYE}"/>` +
    `<circle cx="42.7" cy="38.3" r="1.35" fill="#FFFFFF"/><circle cx="59.7" cy="38.3" r="1.35" fill="#FFFFFF"/>` +
    `<ellipse cx="35" cy="47.5" rx="4.4" ry="2.7" fill="#FF8C9E" opacity="0.45"/><ellipse cx="65" cy="47.5" rx="4.4" ry="2.7" fill="#FF8C9E" opacity="0.45"/>`;
  if (c.hair === 'grandpa') {
    f += `<g fill="none" stroke="#4A4A55" stroke-width="1.8"><circle cx="41.5" cy="40" r="6.4"/><circle cx="58.5" cy="40" r="6.4"/><path d="M47.9,40 Q50,38.6 52.1,40"/></g>`;
    f += `<path d="M43,49 Q46.5,46.2 50,48.4 Q53.5,46.2 57,49 Q53.5,51.2 50,49.6 Q46.5,51.2 43,49 Z" fill="#${c.hairColor}" stroke="${deep(c.hairColor, -0.45)}" stroke-width="1.4"/>`;
  } else {
    f += `<path d="M45.5,48.5 Q50,52.6 54.5,48.5" stroke="${EYE}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
  }
  return f;
}

function carryBehind(c: Character) {
  // the backpack sits behind the body; only its sides show
  if (c.carry !== 'backpack') return '';
  const b = c.carryColor;
  return `<rect x="29" y="62" width="42" height="32" rx="10" fill="#${b}" stroke="${deep(b, -0.45)}" stroke-width="2"/>`;
}

function carryFront(c: Character) {
  const b = c.carryColor;
  const ink = deep(b, -0.5);
  switch (c.carry) {
    case 'suitcase':
      return (
        `<rect x="77.5" y="72" width="4" height="12" rx="1.5" fill="#9AA3B2" stroke="#5B6478" stroke-width="1.4"/>` +
        `<rect x="70" y="82" width="19" height="27" rx="4.5" fill="#${b}" stroke="${ink}" stroke-width="2"/>` +
        `<rect x="74" y="82" width="2.4" height="27" fill="${shade(b, -0.15)}"/><rect x="82.6" y="82" width="2.4" height="27" fill="${shade(b, -0.15)}"/>` +
        `<rect x="71.5" y="84" width="4" height="10" rx="2" fill="#FFFFFF" opacity="0.35"/>` +
        `<circle cx="73.5" cy="111" r="2.4" fill="#3A3F4F"/><circle cx="85.5" cy="111" r="2.4" fill="#3A3F4F"/>`
      );
    case 'backpack':
      return `<path d="M40,61 L41,86" stroke="${ink}" stroke-width="4.6" stroke-linecap="round"/><path d="M60,61 L59,86" stroke="${ink}" stroke-width="4.6" stroke-linecap="round"/><path d="M40,61 L41,86" stroke="#${b}" stroke-width="2.4" stroke-linecap="round"/><path d="M60,61 L59,86" stroke="#${b}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'handbag':
      return `<path d="M61,62 L33,88" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/><rect x="21" y="85" width="17" height="14" rx="4.5" fill="#${b}" stroke="${ink}" stroke-width="2"/><rect x="27" y="88" width="5" height="3" rx="1.2" fill="#F2D57E"/>`;
    case 'teddy': {
      const t = `#${b}`;
      return `<g stroke="${ink}" stroke-width="1.6"><ellipse cx="20" cy="98" rx="8" ry="9" fill="${t}"/><circle cx="20" cy="85" r="6.6" fill="${t}"/><circle cx="15" cy="80" r="2.6" fill="${t}"/><circle cx="25" cy="80" r="2.6" fill="${t}"/></g><circle cx="17.8" cy="84.5" r="1.1" fill="${EYE}"/><circle cx="22.2" cy="84.5" r="1.1" fill="${EYE}"/><ellipse cx="20" cy="87.6" rx="2" ry="1.4" fill="${shade(b, 0.4)}"/>`;
    }
  }
}

export function travelerSvg(ci: number, hex: string) {
  const c = CHARACTERS[ci]!;
  const skin = `#${c.skin}`;
  const skinInk = deep(c.skin, -0.42);
  const shirtInk = deep(hex, -0.5);
  const pants = `#${c.pants}`;
  const pantsInk = deep(c.pants, -0.45);
  const holdsCase = c.carry === 'suitcase';
  const holdsLeft = c.carry === 'teddy';
  // arms: shoulder to hand
  const armL = holdsLeft ? 'M35,66 L25,82' : 'M35,66 L28.5,84';
  const handL = holdsLeft ? [24, 84] : [28, 88];
  const armR = holdsCase ? 'M65,66 L76,74' : 'M65,66 L71.5,84';
  const handR = holdsCase ? [78.5, 74.5] : [72, 88];
  const arm = (d: string) => `<path d="${d}" stroke="${shirtInk}" stroke-width="12.5" stroke-linecap="round" fill="none"/><path d="${d}" stroke="url(#shirt)" stroke-width="8.5" stroke-linecap="round" fill="none"/>`;
  const hand = ([x, y]: number[]) => `<circle cx="${x}" cy="${y}" r="4.7" fill="${skin}" stroke="${skinInk}" stroke-width="1.8"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 100 140" width="100" height="140">
<defs>
<radialGradient id="shirt" cx="0.34" cy="0.22" r="0.95"><stop offset="0" stop-color="${shade(hex, 0.38)}"/><stop offset="0.45" stop-color="#${hex}"/><stop offset="1" stop-color="${shade(hex, -0.22)}"/></radialGradient>
<radialGradient id="skin" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="${shade(c.skin, 0.22)}"/><stop offset="1" stop-color="${skin}"/></radialGradient>
</defs>
${hairBack(c)}${carryBehind(c)}
<rect x="39" y="92" width="9.5" height="19" rx="4.6" fill="${pants}" stroke="${pantsInk}" stroke-width="1.8"/>
<rect x="51.5" y="92" width="9.5" height="19" rx="4.6" fill="${pants}" stroke="${pantsInk}" stroke-width="1.8"/>
<ellipse cx="43.5" cy="112.5" rx="6.4" ry="3.8" fill="#34313D"/><ellipse cx="56.5" cy="112.5" rx="6.4" ry="3.8" fill="#34313D"/>
${arm(armL)}${arm(armR)}
<path d="M33,69 Q33,61 41,61 L59,61 Q67,61 67,69 L68,90 Q68,98 60,98 L40,98 Q32,98 32,90 Z" fill="url(#shirt)" stroke="${shirtInk}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M43.5,61 L50,69.5 L56.5,61 Z" fill="#FFFFFF" stroke="${shirtInk}" stroke-width="1.6" stroke-linejoin="round"/>
<ellipse cx="40" cy="70" rx="4" ry="6" fill="#FFFFFF" opacity="0.22"/>
${carryFront(c)}${hand(handL)}${hand(handR)}
<rect x="45" y="56" width="10" height="7" rx="3" fill="${shade(c.skin, -0.12)}"/>
<circle cx="27.5" cy="41" r="5" fill="${skin}" stroke="${skinInk}" stroke-width="1.8"/><circle cx="72.5" cy="41" r="5" fill="${skin}" stroke="${skinInk}" stroke-width="1.8"/>
<circle cx="50" cy="38" r="23" fill="url(#skin)" stroke="${skinInk}" stroke-width="2"/>
${face(c)}${hairFront(c)}
</svg>
`;
}

export type Outfit = 'party' | 'beach' | 'winter' | 'royal';
export const OUTFIT_IDS: Outfit[] = ['party', 'beach', 'winter', 'royal'];

/** Hat (and extras) drawn over any traveler; same viewBox. */
export function outfitSvg(o: Outfit) {
  let body = '';
  switch (o) {
    case 'party':
      body =
        `<path d="M37,19 L63,19 L52,-14 Z" fill="#FFFFFF" stroke="#7A5CC2" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M40.8,11 L59.9,13 L57.6,6 L43.4,4.6 Z" fill="#9B7BFF" opacity="0.9"/><path d="M45.8,-2.5 L55.7,-1 L54,-6.3 L48,-7.2 Z" fill="#9B7BFF" opacity="0.9"/>` +
        `<circle cx="52" cy="-15" r="5" fill="#FFD447" stroke="#C99A12" stroke-width="1.6"/>`;
      break;
    case 'beach':
      body =
        `<ellipse cx="50" cy="19" rx="35" ry="9" fill="#F3D38B" stroke="#B8914A" stroke-width="2"/>` +
        `<path d="M34,19 C34,3 66,3 66,19 Z" fill="#F7DC9C" stroke="#B8914A" stroke-width="2"/>` +
        `<path d="M34.6,14 Q50,18.5 65.4,14 L66,19 Q50,23 34,19 Z" fill="#8C5A2B"/>` +
        `<g stroke="#1F2230" stroke-width="1.6"><rect x="33.5" y="35" width="15" height="10" rx="4" fill="#1F2230"/><rect x="51.5" y="35" width="15" height="10" rx="4" fill="#1F2230"/><path d="M48.5,38 Q50,36.5 51.5,38" fill="none"/></g>` +
        `<path d="M36,37.5 L40,37.5" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/><path d="M54,37.5 L58,37.5" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
      break;
    case 'winter':
      body =
        `<path d="M25,31 C25,4 75,4 75,31 Z" fill="#F4EBDD" stroke="#B9A889" stroke-width="2" stroke-linejoin="round"/>` +
        `<g stroke="#E3D5BE" stroke-width="2.2" fill="none"><path d="M36,28 L36,12"/><path d="M44,28 L44,8"/><path d="M50,28 L50,7"/><path d="M56,28 L56,8"/><path d="M64,28 L64,12"/></g>` +
        `<rect x="23" y="25" width="54" height="10" rx="5" fill="#E2D2B8" stroke="#B9A889" stroke-width="2"/>` +
        `<circle cx="50" cy="3" r="8" fill="#FFFFFF" stroke="#C9BDA7" stroke-width="2"/>` +
        `<path d="M36,60 Q50,67 64,60 L64,66 Q50,73 36,66 Z" fill="#F4EBDD" stroke="#B9A889" stroke-width="1.8"/><rect x="56" y="64" width="8" height="16" rx="3" fill="#F4EBDD" stroke="#B9A889" stroke-width="1.8"/>`;
      break;
    case 'royal':
      body =
        `<defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE98A"/><stop offset="1" stop-color="#F0AE1C"/></linearGradient></defs>` +
        `<path d="M33,19 L33,1 L41.5,9 L50,-5 L58.5,9 L67,1 L67,19 Z" fill="url(#gold)" stroke="#A8740C" stroke-width="2" stroke-linejoin="round"/>` +
        `<rect x="32" y="15" width="36" height="6" rx="2" fill="#F5C23A" stroke="#A8740C" stroke-width="1.6"/>` +
        `<circle cx="33" cy="1" r="2.6" fill="#FFFFFF"/><circle cx="50" cy="-5" r="3" fill="#FFFFFF"/><circle cx="67" cy="1" r="2.6" fill="#FFFFFF"/><circle cx="50" cy="11" r="3" fill="#7FD3FF" stroke="#2D7FB8" stroke-width="1.2"/>`;
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 100 140" width="100" height="140">\n${body}\n</svg>\n`;
}

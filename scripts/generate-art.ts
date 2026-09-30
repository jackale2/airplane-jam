// Writes the generated SVG art. Run: npm run gen:art
//   public/assets/planes/<livery>/plane_<length>_<color>.svg   5 liveries x 3 lengths x 8 colors
//   public/assets/passengers/traveler_<character>_<color>.svg   8 characters x 8 colors
//   public/assets/passengers/outfit_<outfit>.svg                hats and extras drawn over any traveler
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { PALETTE } from './art/color.ts';
import { LIVERY_IDS, planeSvg } from './art/planes.ts';
import { CHARACTERS, OUTFIT_IDS, outfitSvg, travelerSvg } from './art/travelers.ts';

const PLANES = 'public/assets/planes';
const PAX = 'public/assets/passengers';
rmSync(PLANES, { recursive: true, force: true });
rmSync(PAX, { recursive: true, force: true });

let n = 0;
for (const livery of LIVERY_IDS) {
  mkdirSync(`${PLANES}/${livery}`, { recursive: true });
  for (const length of [2, 3, 4] as const) {
    PALETTE.forEach((hex, color) => {
      writeFileSync(`${PLANES}/${livery}/plane_${length}_${color}.svg`, planeSvg(livery, length, hex));
      n++;
    });
  }
}
mkdirSync(PAX, { recursive: true });
CHARACTERS.forEach((_, ci) => {
  PALETTE.forEach((hex, color) => {
    writeFileSync(`${PAX}/traveler_${ci}_${color}.svg`, travelerSvg(ci, hex));
    n++;
  });
});
for (const o of OUTFIT_IDS) {
  writeFileSync(`${PAX}/outfit_${o}.svg`, outfitSvg(o));
  n++;
}
console.log(`wrote ${n} SVG files`);

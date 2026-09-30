// Store screenshots and the Google Play feature graphic, rendered from the running game.
//   1. npm run dev            (in another terminal)
//   2. npm run store:shots     (needs Playwright: `npm i -D playwright && npx playwright install chromium` once)
// Output goes to store/. Pass a different game URL as the first argument if needed.
import { mkdirSync, readFileSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const OUT = 'store';
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// CSS viewport x device pixel ratio = exact store sizes
const DEVICES = [
  { name: 'phone-1080x1920', width: 360, height: 640, dpr: 3 },
  { name: 'phone-1242x2688', width: 414, height: 896, dpr: 3 },
  { name: 'tablet-1600x2560', width: 800, height: 1280, dpr: 2 },
  { name: 'tablet-2048x2732', width: 1024, height: 1366, dpr: 2 },
];

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });

async function open(dev, query) {
  const ctx = await browser.newContext({ viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL + query);
  await page.waitForFunction(() => window.__game?.scene?.isActive('Home'), null, { timeout: 60000 });
  // a lived-in save (stars on the levels behind) without the one-time Zen announcement, so the home shot is clean
  await page.evaluate(() => {
    const d = window.__services().save.data;
    d.flags.zenAnnounced = true;
    for (let l = 1; l < d.level; l++) d.stars[l] = l % 7 === 3 ? 2 : 3;
    window.__game.scene.getScene('Home').scene.restart();
  });
  await page.waitForTimeout(2500);
  return { ctx, page };
}

const start = (page, key, data) => page.evaluate(([k, d]) => window.__game.scene.getScenes(true)[0].scene.start(k, d), [key, data]);
// let taxiing and boarding finish (software WebGL in headless browsers runs the game clock slowly)
const settle = (page) => page.waitForFunction(() => !window.__aj.scene.busy, null, { timeout: 120000 }).catch(() => {});
// no "try this plane" hint in the shot
const noHint = (page) => page.evaluate(() => {
  const sc = window.__aj.scene;
  sc.lastInput = sc.time.now;
  sc.clearHint();
});

// SHOTS=map,zen npm run store:shots  retakes only some screens (home, gameplay, map, zen, shop, feature);
// DEVICES=tablet-2048x2732 limits the device sizes
const ONLY = (process.env.SHOTS ?? '').split(',').filter(Boolean);
const want = (name) => ONLY.length === 0 || ONLY.includes(name);
const ONLY_DEVICES = (process.env.DEVICES ?? '').split(',').filter(Boolean);

for (const dev of DEVICES.filter((d) => ONLY_DEVICES.length === 0 || ONLY_DEVICES.includes(d.name))) {
  if (!['home', 'gameplay', 'map', 'zen', 'shop'].some(want)) break;
  const { ctx, page } = await open(dev, '?fresh&level=27&coins=2350');
  if (want('home')) await page.screenshot({ path: `${OUT}/${dev.name}-2-home.png` });

  // gameplay: a few smart taps into a level so planes are parked and travelers are boarding
  if (want('gameplay')) {
    await start(page, 'Game', { mode: 'level', level: 27 });
    await page.waitForFunction(() => window.__aj?.scene?.ready, null, { timeout: 60000 });
    await page.waitForTimeout(1800);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.__aj.tapHint());
      await page.waitForTimeout(700);
      await settle(page);
    }
    await page.waitForTimeout(500);
    await noHint(page);
    await page.screenshot({ path: `${OUT}/${dev.name}-1-gameplay.png` });
  }

  // world map: a player a few levels into Paris, with the city and its sign at the bottom and the path above
  if (want('map')) {
    await page.evaluate(() => {
      const d = window.__services().save.data;
      d.level = 23;
      for (let l = 23; l < 27; l++) delete d.stars[l];
    });
    await start(page, 'Map', {});
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const sc = window.__game.scene.getScene('Map');
      const cityTop = sc.nodeY(21) + 180 * 0.4;
      sc.sv.scrollTo(cityTop + 470 - sc.sv.rect.h);
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/${dev.name}-3-map.png` });
  }

  if (want('zen')) {
    await start(page, 'Game', { mode: 'zen' });
    await page.waitForFunction(() => window.__aj?.scene?.ready && window.__aj.scene.mode === 'zen', null, { timeout: 60000 });
    await page.waitForTimeout(1800);
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.__aj.tapHint());
      await page.waitForTimeout(700);
      await settle(page);
    }
    await noHint(page);
    await page.screenshot({ path: `${OUT}/${dev.name}-4-zen.png` });
  }

  if (want('shop')) {
    await start(page, 'Shop', { tab: 'outfit' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${dev.name}-5-shop.png` });
  }
  await ctx.close();
  console.log('wrote', dev.name);
}

// Feature graphic: title, planes and travelers on a sky gradient, 1024 x 500
if (!want('feature')) {
  await browser.close();
  process.exit(0);
}
const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
const A = new globalThis.URL('assets/', URL).href;
// the font goes in inline: a blank page may not load it from the dev server (cross-origin)
const FONT = readFileSync('public/assets/fonts/Fredoka.ttf').toString('base64');
const planes = [[0, 150, 60, -35], [5, 240, 250, 25], [2, 815, 70, 30], [6, 900, 260, -20], [3, 60, 300, 15]];
const pax = [[0, 1], [1, 5], [2, 7], [3, 3], [4, 0], [5, 4], [6, 6], [7, 2]];
await page.setContent(`<html><head><style>
@font-face { font-family: Fredoka; src: url(data:font/ttf;base64,${FONT}); font-weight: 300 700; }
body { margin: 0; width: 1024px; height: 500px; overflow: hidden; background: linear-gradient(#6ec8f5, #d4f1ff); font-family: Fredoka; position: relative; }
.cloud { position: absolute; background: #fff; border-radius: 60px; opacity: .85; }
h1 { position: absolute; left: 0; right: 0; top: 70px; margin: 0; text-align: center; font-size: 118px; line-height: .95; font-weight: 700; color: #fff;
     -webkit-text-stroke: 14px #1b2a52; paint-order: stroke fill; text-shadow: 0 8px 0 rgba(27,42,82,.35); }
h1 span { color: #ff5a5f; }
.p { position: absolute; width: 70px; filter: drop-shadow(6px 10px 6px rgba(0,0,0,.25)); }
.t { position: absolute; bottom: 8px; width: 78px; }
.ground { position: absolute; left: 0; right: 0; bottom: 0; height: 70px; background: linear-gradient(#f4e3b5, #e9d49a); }
</style></head><body>
<div class="cloud" style="left:40px;top:40px;width:220px;height:60px"></div>
<div class="cloud" style="left:760px;top:30px;width:240px;height:66px"></div>
<div class="cloud" style="left:420px;top:390px;width:260px;height:60px"></div>
${planes.map(([c, x, y, a]) => `<img class="p" src="${A}planes/classic/plane_3_${c}.svg" style="left:${x}px;top:${y}px;transform:rotate(${a}deg)">`).join('')}
<div class="ground"></div>
${pax.map(([ch, c], i) => `<img class="t" src="${A}passengers/traveler_${ch}_${c}.svg" style="left:${250 + i * 66}px">`).join('')}
<h1>AIRPLANE<br><span>JAM</span></h1>
</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/feature-graphic-1024x500.png` });
console.log('wrote feature graphic');
await browser.close();

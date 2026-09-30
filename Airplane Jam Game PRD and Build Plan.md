# Airplane Jam: Game PRD and Build Plan

Sep 30, 2026 · @jack

## Vision and goals

Airplane Jam is a portrait, one-handed mobile puzzle game where the player taps planes to taxi them out of a crowded apron and load matching-color passengers. It follows the traffic-escape puzzle genre, with an original airport theme, name, and art. The target platform is Android (Google Play), built with Phaser 3 and TypeScript.

**Goals**

- A fun core loop: each level takes 30 to 90 seconds and plays with one thumb.
- At least 100 always-solvable levels, plus a generator for endless levels.
- A shippable free game on Google Play, funded by rewarded ads, light interstitials, and a Remove Ads purchase.
- Easy to vibe code: every feature is small, testable, and built phase by phase (see Milestones).

**Target player.** Casual mobile players of all ages who play in 3 to 5 minute sessions.

**Success targets** (initial, tune after testing)

| Metric | Target |
| --- | --- |
| Frame rate on a mid-range Android phone | 60 fps steady |
| Level load time | under 1 second |
| Install size | under 50 MB |
| Crash-free sessions | 99% or higher |
| Day-1 retention after soft launch | 35% or higher |

**Non-goals for v1**

- iOS, multiplayer, 3D graphics, user accounts, or a backend server.
- Any asset, name, icon, or screenshot copied from the reference game.

**Open decisions for the owner**

- Final game name and app icon (both must be original).
- Whether to launch with ads only, or ads plus purchases.

## Instructions for the AI agent

Read this section first: it sets the setup steps and asset rules you must follow. You are building the game described in this document with Phaser 3 and TypeScript.

**1. Clone the audio pack**

Clone the sound effects repository into the project:

```bash
git clone https://github.com/Calinou/kenney-ui-audio public/assets/audio/kenney-ui-audio
```

Remove the nested `.git` folder from the clone so the project repository tracks the files normally, and keep its license file. List the cloned folder, then copy the sounds the game needs into `public/assets/audio/sfx/` with clear names such as `click.wav`, `popup.wav`, `coin.wav`, `win.wav`, and `fail.wav`. Optionally convert the copies to `.ogg` to reduce app size.

**2. Use the assets already in the project**

All other asset files (UI images, fonts, and any music) are already inside the project folder under `public/assets/`. Do not download, invent, or replace them. Before writing code:

- List everything under `public/assets/` and write a manifest at `src/data/assets.ts` from what actually exists.
- If an asset you need is missing, use a temporary placeholder and add a line to `ASSETS_TODO.md`.

**3. Generate the planes yourself**

The planes are the only assets that do not exist yet. Create them as SVG with a Node script (`scripts/generate-planes.ts`) that writes files to `public/assets/planes/`. The full spec is in the Art and audio section.

**4. Working rules**

- Work one milestone at a time, in the order given under Milestones.
- After each milestone, run the build and unit tests, keep the game playable in the browser, and make a git commit.
- Keep game rules in `src/core/` with no Phaser imports, so they can be unit tested.
- Ask before adding any dependency that is not listed under Tech stack.
- Use only original names, art, icon, and text. Do not copy assets or branding from any existing game.
- Record third-party assets in `CREDITS.md`.

## Tech stack and project structure

The game is a Vite + TypeScript web project using Phaser 3, packaged as an Android app with Capacitor.

| Area | Choice |
| --- | --- |
| Engine | Phaser 3 (current 3.x release) |
| Physics | None: movement is grid-based and tweened |
| Language | TypeScript, strict mode |
| Build | Vite |
| Tests | Vitest, for everything in `src/core` |
| Android packaging | Capacitor (Android) |
| Ads | AdMob through a Capacitor plugin; check the current maintained plugin at Milestone 6 |
| Purchases | A Capacitor in-app purchase plugin (for example RevenueCat's); check current docs at Milestone 6 |
| Save data | Capacitor Preferences, with `localStorage` as the browser fallback |
| Backend | None |

Design resolution is 1080 x 1920 (portrait), scaled with Phaser `Scale.FIT` and centered. Lock the app to portrait in the Capacitor Android config.

```
airplane-jam/
  index.html
  package.json  tsconfig.json  vite.config.ts  capacitor.config.ts
  ASSETS_TODO.md  CREDITS.md
  scripts/
    generate-planes.ts      writes the plane SVGs
    generate-levels.ts      writes src/data/levels.json
  public/assets/
    ui/                     already present (buttons, panels, icons)
    fonts/                  already present (TTF)
    audio/
      kenney-ui-audio/      git clone, keep its license
      sfx/                  renamed copies the game uses
      music/                optional
    planes/                 generated SVGs
  src/
    main.ts  config.ts
    core/                   pure logic, no Phaser: board, game, solver, generator, rng
    scenes/                 Boot, Preload, Menu, Game, Shop
    ui/                     Button, Popup, Hud, CoinCounter, BoosterBar
    systems/                AudioManager, SaveManager, EconomyManager, AdsManager, IapManager
    data/                   assets.ts, colors.ts, tuning.ts, levels.json
    tests/
```

## Core gameplay rules

The player taps a plane, the plane taxis out of the apron in the direction it faces, parks at a free gate, and boards passengers of its own color from the queue. The level is won when every plane has departed.

**Board layout, top to bottom on screen**

1. Passenger queue: a track shaped like a loop, star, or heart, filled with colored passengers in a fixed order.
2. Gate row: 4 to 7 slots where taxied planes park.
3. Apron: the tap grid, holding all planes that have not moved yet.

**Plane**

- Occupies a straight line of 2, 3, or 4 cells, one cell wide.
- Has one color (8 colors) and one facing direction: up, down, left, or right.
- Seat capacity is 2 x length in cells (4, 6, or 8). Keep this value in `tuning.ts`.

**Tap rules**

1. If every cell between the plane's nose and the grid edge, in its facing direction, is empty, the plane taxis out.
2. If any of those cells is occupied, the plane bumps: a short shake, a bump sound, a light haptic, and no state change.
3. A plane that taxis out leaves the grid at once, so its cells are free for other planes.
4. It then moves to the first free gate slot, left to right. If no slot is free, the tap is rejected and the plane bumps.

**Boarding rules**

1. Only the passenger at the head of the queue can board.
2. A passenger boards a parked plane of the same color that still has free seats, one passenger every 0.1 seconds.
3. When a plane's seats are full, it takes off and its gate slot becomes free.
4. If no parked plane matches the head passenger's color, boarding waits.

**End conditions**

- Win: all planes have departed and the queue is empty.
- Fail (deadlock): every gate slot is occupied and no parked plane can board the head passenger.

**Level data invariant.** For each color, the number of passengers equals the total seats of the planes of that color. The generator and validator must enforce this.

There is no move limit or timer in v1. Taps during animations are queued or ignored, and must never break game state.

## Level design and generator

Every level is a plain data object, and a seeded generator with a solver guarantees each one can be won. Ship 100 pre-generated levels in `src/data/levels.json` (built by `npm run gen:levels`), and use the level number as the seed for levels after that.

```ts
interface LevelData {
  id: number;
  seed: number;
  cols: number;
  rows: number;
  gateSlots: number;
  planes: {
    id: number;
    color: number;               // 0 to 7
    length: 2 | 3 | 4;
    x: number;                   // nose cell
    y: number;
    dir: 'up' | 'down' | 'left' | 'right';   // body extends opposite to dir
  }[];
  queue: number[];               // color index per passenger, head first
  queueShape: 'loop' | 'star' | 'heart' | 'spiral';   // visual only
  parMinSlots: number;           // fewest gate slots that still allow a win
}
```

**Generator (reverse construction)**

1. Pick grid size, plane count, colors, and plane lengths from the difficulty table below.
2. Place planes one at a time at random free cells and directions, so that each new plane's exit path crosses no plane already placed. The last plane placed is the first one that can be tapped.
3. This guarantees the apron alone can always be cleared, because removing a plane never blocks another plane.
4. Assign colors, then compute seats per color.
5. Build the queue from those seat counts. A `mix` value sets the order: low mix groups colors in runs, high mix interleaves them.
6. Run the solver. If the level is unsolvable, or the solver hits its node cap, retry with the next seed.
7. Store `parMinSlots`. Levels are harder when `gateSlots` is close to `parMinSlots`.

**Solver.** Depth-first search over states of (planes still on the apron, gate contents, queue position), with memoization and a cap of about 200,000 nodes. Boarding happens automatically after every tap, exactly as in the game rules.

**Difficulty curve**

| Levels | Grid (cols x rows) | Planes | Colors | Lengths | Gate slots |
| --- | --- | --- | --- | --- | --- |
| 1 to 5 | 5 x 6 | 5 to 8 | 2 | 2 | 6 |
| 6 to 20 | 6 x 8 | 8 to 16 | 3 to 4 | 2 to 3 | 6 |
| 21 to 50 | 7 x 10 | 16 to 30 | 4 to 6 | 2 to 4 | 5 |
| 51 to 100 | 8 x 12 | 30 to 50 | 6 to 8 | 2 to 4 | 5 |
| 101 and up | 9 x 14 | 45 to 70 | 8 | 2 to 4 | 4 to 5 |

Add a Vitest test that generates 200 levels and asserts every one passes the solver and the color invariant.

## Boosters, economy, and monetization

Players earn coins by winning levels, spend them on three boosters, and can watch rewarded ads or buy coins when they get stuck. All prices live in `tuning.ts`.

**Boosters** (a bar of three buttons at the bottom of the game screen, each showing its count)

| Booster | Effect | Cost |
| --- | --- | --- |
| Extra Gate | Adds 1 temporary gate slot for the current level | 100 coins, or 1 rewarded ad |
| Sort Queue | Regroups the first 8 passengers in the queue so matching colors sit together | 100 coins, or 1 rewarded ad |
| Shuffle Board | Re-lays the planes still on the apron into a new solvable layout | 150 coins, or 1 rewarded ad |

**Coins**

- Level win: +20 coins.
- First win of each day: +50 bonus coins (daily reward).
- Watch a rewarded ad on the win screen to double the level reward.

**Ads**

- Rewarded: revive after a fail (adds 1 gate slot and continues), free booster, double coins.
- Interstitial: after a level is won, from level 6 on, at most once every 3 levels and never within 90 seconds of the previous ad. Never during a level.
- No banner ads.
- Use AdMob test ad units in development. Never tap live ads on your own device.
- Show the Google consent form (UMP) before the first ad request where required.

**Purchases**

- Remove Ads (one time): removes interstitials only. Rewarded ads stay optional.
- Three coin packs (small, medium, large).
- A Restore Purchases button in Settings.

`AdsManager` and `IapManager` must be safe no-ops in the browser, so the game stays playable with `npm run dev`.

## Screens and UX

The game has eight screens, all in portrait, and every action is a single tap.

| Screen | Contents |
| --- | --- |
| Boot and Preload | Logo, progress bar, loads all assets |
| Main menu | Play button showing the current level, Shop, Settings, daily reward |
| Game | HUD (level number, pause, restart, coins), passenger queue, gate row, apron, booster bar |
| Win popup | Coins earned, double-coins rewarded ad, Next Level |
| Fail popup | Revive (rewarded ad), Retry, Home |
| Pause popup | Resume, Restart, Home, sound and music toggles |
| Shop | Coin packs, Remove Ads |
| Settings | Sound, music, vibration, colorblind symbols, privacy policy link, Restore Purchases |

**Game screen layout** (percent of the 1920 px design height, top to bottom)

| Region | Height |
| --- | --- |
| HUD | 0 to 8% |
| Passenger queue track | 8 to 30% |
| Gate row | 30 to 38% |
| Apron grid | 38 to 88% |
| Booster bar | 88 to 100% |

Compute the cell size so the largest grid in the difficulty table fits the apron region with a small margin.

**Feel targets**

- Taxi movement at about 900 px per second with ease-in, so a plane never teleports.
- Bump: 0.2 second shake plus a haptic tick (Capacitor Haptics).
- Boarding: 0.1 second per passenger, with the pitch rising as the plane fills.
- Takeoff: about 0.6 seconds, then the gate slot frees.

**Other requirements**

- Tutorial on levels 1 to 3: a pointing hand on the correct plane, and a short text bubble.
- Tap targets at least 48 dp. Respect Android safe-area insets.
- Colorblind mode draws a unique symbol on every plane and passenger.
- Pause automatically when the app goes to the background.

## Art and audio spec

Planes are generated SVG, everything else comes from the assets already in the project, and sounds come from the cloned Kenney pack plus a few generated effects.

**Plane SVGs**

- Script: `scripts/generate-planes.ts` writes 24 files (3 lengths x 8 colors) named `plane_{length}_{color}.svg` into `public/assets/planes/`.
- View: top-down, nose pointing up. The viewBox is 100 wide and 100 x length tall, so a plane fits its cells with about 4% padding.
- Style: chunky and friendly, with a 6 unit dark outline (`#1B2340`), a flat body color, a lighter highlight strip, a white cockpit, a row of small windows, swept wings that stay inside the cell width, and a tail fin.
- Length 2 is a short regional jet, length 3 is a narrow-body airliner, length 4 is a wide-body with four engines.
- Export one facing only. Rotate the sprite in code for the other three directions.
- Load with `this.load.svg(key, path, { scale: 2 })` so planes stay sharp on high-density screens.

**Color palette**

| Index | Name | Hex |
| --- | --- | --- |
| 0 | Red | `#E53935` |
| 1 | Orange | `#FB8C00` |
| 2 | Yellow | `#FDD835` |
| 3 | Green | `#43A047` |
| 4 | Cyan | `#00ACC1` |
| 5 | Blue | `#1E88E5` |
| 6 | Purple | `#8E24AA` |
| 7 | Pink | `#EC407A` |

**Other visuals**

- Apron: drawn with Phaser Graphics, dark gray (`#2B2F3A`) with dashed yellow taxi lines. No image file needed.
- Gate slots: rounded rectangles with a number.
- Passengers: small colored circles, or the ball sprites from `public/assets/ui` if present.
- Buttons, panels, coins, and icons: from `public/assets/ui`. Fonts: from `public/assets/fonts`.
- Store graphics (512 x 512 icon, 1024 x 500 feature graphic, screenshots) are made outside the code, near release.

**Sound events**

| Event | Source |
| --- | --- |
| Button click, popup open and close | Cloned Kenney UI audio |
| Coin gained | Cloned Kenney UI audio |
| Passenger boards | Short tick from Kenney UI audio, pitch rising per passenger |
| Win and fail | Cloned Kenney UI audio |
| Bump | Generated in `AudioManager` with WebAudio (short low thud) |
| Taxi | Generated filtered-noise whoosh |
| Takeoff | Generated rising noise sweep, or a CC0 file dropped into `sfx/` |
| Music | Optional file in `public/assets/audio/music/`; if none exists, play no music |

Audio rules: unlock audio on the first tap (mobile autoplay), keep separate music and sound volumes, save the mute state, and never block gameplay while a sound loads.

## Systems architecture

The rules live in a pure, deterministic core, and the Phaser scene only draws what the core reports. This keeps the game testable and easy to change with AI help.

| Module | Responsibility |
| --- | --- |
| `core/Board` | Grid state, plane cells, `canTaxi(id)`, `taxi(id)` |
| `core/Game` | Full rules: gate slots, queue, boarding, win and fail. `tap(id)` returns a list of events |
| `core/Solver` | Solvability check and `parMinSlots` |
| `core/Generator` | Seeded level generation by reverse construction |
| `scenes/GameScene` | Builds sprites from `LevelData`, forwards taps to `core/Game`, plays returned events as animations in order |
| `systems/AudioManager` | Loads and plays sounds, volumes, mute, generated effects |
| `systems/SaveManager` | Loads and saves JSON, with a version number and migrations |
| `systems/EconomyManager` | Coins, booster counts, daily reward |
| `systems/AdsManager` | Rewarded and interstitial ads, consent, cooldowns, browser no-op |
| `systems/IapManager` | Purchases and restore, browser no-op |

**Events returned by `core/Game`:** `PLANE_TAXI`, `PLANE_BUMP`, `PLANE_PARKED`, `PASSENGER_BOARDED`, `PLANE_DEPARTED`, `LEVEL_WON`, `LEVEL_FAILED`.

**Save data**

```json
{
  "version": 1,
  "level": 1,
  "coins": 0,
  "boosters": { "extraGate": 1, "sortQueue": 1, "shuffleBoard": 1 },
  "settings": { "sound": true, "music": true, "vibration": true, "colorblind": false },
  "adsRemoved": false,
  "lastDailyReward": "",
  "tutorialSeen": false
}
```

Save after every level result and every purchase. If the saved file is missing or corrupt, start fresh and never crash.

## Milestones

Build in eight milestones, in this order, and do not start one until the previous one is done. Durations are rough estimates for part-time vibe coding, about 4 to 6 weeks in total.

1. **Milestone 0: Setup (about 1 day).** Create the Vite + Phaser + TypeScript project and the folder structure, clone the audio repo, write the asset manifest, and add the Vitest setup. Done when `npm run dev` shows the Boot scene and every asset loads with no 404 errors.
2. **Milestone 1: Core mechanic prototype (about 4 days).** Generate the plane SVGs, draw the apron, gate row, and queue, and implement tap to taxi, bumping, parking, boarding, takeoff, win, and fail on one hardcoded level. Done when that level can be played from start to win and to fail in the browser.
3. **Milestone 2: Levels (about 4 days).** Build `core/Generator` and `core/Solver`, the difficulty table, `gen:levels`, and the 100 pre-generated levels. Done when the 200-level test passes and level 1 to 100 load in order.
4. **Milestone 3: UI and feel (about 5 days).** Add the menu, HUD, popups, settings, sounds, animations, tutorial, and colorblind mode. Done when a new player can install, learn the game in levels 1 to 3, and play 20 levels without confusion.
5. **Milestone 4: Boosters, economy, and saving (about 3 days).** Add the three boosters, coins, daily reward, and `SaveManager`. Done when progress survives closing and reopening the app.
6. **Milestone 5: Android build (about 3 days).** Add Capacitor, build a debug APK, and test on a real phone. Done when the game holds 60 fps on the device, respects safe areas, and pauses when backgrounded.
7. **Milestone 6: Monetization (about 4 days).** Integrate AdMob with test ads, the consent form, rewarded and interstitial rules, and in-app purchases. Done when every ad placement and purchase works with test IDs and Remove Ads persists.
8. **Milestone 7: Polish and release (about 1 to 2 weeks).** Make the icon, screenshots, and store listing, write the privacy policy, fix bugs from device testing, and run Play Console testing before production. Done when the release checklist below is fully ticked.

## Acceptance criteria, QA, and release

The game is ready to ship when every box below is ticked.

**Gameplay**

- [ ] All 100 shipped levels are solvable, and the 200-level generator test passes.
- [ ] A blocked plane always bumps and never changes state.
- [ ] A plane can never be parked in an occupied gate slot.
- [ ] Deadlock triggers the Fail popup, and Revive continues the same level.
- [ ] Winning is impossible with passengers left in the queue, and Fail is impossible while a legal move exists.

**Quality**

- [ ] 60 fps on a mid-range Android phone, with no memory growth over 50 levels played in a row.
- [ ] Install size under 50 MB.
- [ ] No crash when the save file is missing or corrupt.
- [ ] Works with sound off, with no network, and when the app is backgrounded and resumed mid-level.
- [ ] Colorblind mode shows a distinct symbol for all 8 colors.

**Money**

- [ ] Every rewarded ad placement grants its reward exactly once.
- [ ] Interstitial cooldown rules hold, and Remove Ads disables interstitials after a restart.
- [ ] Coin packs and Restore Purchases work with test accounts.

**Google Play release checklist**

- [ ] Google Play developer account created (one-time registration fee).
- [ ] Original app name, icon (512 x 512), feature graphic (1024 x 500), and screenshots.
- [ ] Signed Android App Bundle (`.aab`) built with Capacitor, with the release keystore backed up.
- [ ] Privacy policy published at a public URL and linked in the app.
- [ ] Data safety form and content rating questionnaire completed, including ads.
- [ ] Target API level meets the current Play requirement.
- [ ] Internal and closed testing done. Check the current Play Console rules for new developer accounts before requesting production access.
- [ ] `CREDITS.md` lists all third-party assets, including the Kenney packs.

## Build status and decisions log

Updated Sep 30, 2026. This section records what was built, where the build differs from the plan above, and what only the owner can do.

**Milestone status**

| Milestone | Status |
| --- | --- |
| 0 Setup | Done. Vite + Phaser 3.90 + TypeScript strict, Vitest, asset manifest in `src/data/assets.ts`, audio pack cloned. |
| 1 Core mechanic | Done. All rules live in `src/core` (no Phaser). Plane SVGs come from `npm run gen:planes`. |
| 2 Levels | Done. Generator, solver and `npm run gen:levels`; 100 levels in `src/data/levels.json`. The 200-level test passes. |
| 3 UI and feel | Done in code: menu, HUD, pause/win/fail popups, shop, settings, tutorial on levels 1 to 3, colorblind symbols, sounds. Not yet play-tested by a person on a phone. |
| 4 Boosters, economy, saving | Done. Three boosters (coins or rewarded ad), coins, daily bonus, versioned save that survives a missing or corrupt file. |
| 5 Android build | Partly done. Capacitor config and the Android project exist, and the app is locked to portrait. **No APK yet:** this machine has no JDK or Android SDK. Install Android Studio, then run `npm run cap:sync` and `npm run cap:open`. |
| 6 Monetization | Not started, by design. `AdsManager` and `IapManager` are safe stubs with the final rules (interstitial cooldowns are unit tested). Needs the owner's AdMob app and ad unit IDs, Play Console products, and approval of the plugins (see below). |
| 7 Polish and release | Owner work: Play account, icon, screenshots, privacy policy, device testing. |

**Decisions and deviations**

1. **Assets.** The project shipped two Kenney packs (Puzzle Pack II, Tappy Plane), not the `public/assets/ui` folder the plan described. Kept: the two fonts, yellow buttons, panel, pointing hand, smoke puff, coin, a tintable passenger ball, one sparkle, and 8 Puzzle Pack tile shapes as the colorblind symbols. Deleted: side-view biplanes, letter and number PNGs, ground and rock art, pipes, paddles, back tiles, unused particles, spritesheets, vectors, SWF files and shortcut files. The original packs are in git history (first commit).
2. **Audio.** The cloned Kenney UI audio pack only has clicks, switches and rollovers. Click, popup, coin and boarding tick use it. Win and fail are synthesized with WebAudio, like bump, taxi and takeoff. No music file was supplied, so none plays.
3. **The difficulty table cannot be met exactly.** The apron grids are too small for the plane counts (for example 50 planes of 2 to 4 cells need at least 100 cells, and the 8 x 12 grid has 96). Plane counts are now targets: the generator places planes until one no longer fits, and a plane may come out shorter than requested. Shipped levels hold 5 to 8, 8 to 16, 15 to 25 and 20 to 31 planes in the four bands. Colors and grid sizes follow the table.
4. **Gate slots and queue mix.** Five gates with eight interleaved colors is usually unwinnable. The generator therefore relaxes the queue mix (longer color runs) until the solver can win, and if that fails after 25 layouts it allows one more gate slot (up to three). All shipped levels keep the table's gate count. `parMinSlots` records the real minimum.
5. **Solver.** It runs the real `Game.tap` rules. It only tries taps that help the queue head (a head-color plane, or a plane blocking one), because parking anything else only wastes a slot. Node cap 200,000.
6. **Which plane boards.** If two parked planes match the head passenger, the leftmost gate boards first.
7. **Endless levels.** Levels above 100 are generated from the level number inside a web worker, because a hard level can take several seconds.
8. **Cell size.** The cell size is computed per level so each grid fills the apron, capped at 150 px, instead of one size for the largest grid. On the 9 x 14 grid a cell is about 68 design px, roughly 22 dp on a 360 dp phone. That is below the 48 dp tap target, and planes touch each other, so the hit area cannot grow. See the open question about grid size for levels 101 and up.
9. **Tooling.** Node 24 runs the TypeScript scripts directly, so the code uses erasable syntax only (no enums or constructor parameter properties). `@types/node` was added as a dev dependency for the scripts.
10. **Browser and dev behavior.** Rewarded ads always succeed after 0.4 seconds and interstitials do nothing. In `npm run dev`, purchases are simulated. A production web build grants no purchases.

**Owner answers (Sep 30, 2026)**

- Name: keep "Airplane Jam" as the working title for now.
- Levels: keep placing what fits. Revisit the tap-target size after phone testing.
- Launch monetization: ads only first. Coin packs and Remove Ads stay in the code but ship in a later update.
- Android: no Android Studio, phone or AdMob account yet, so Milestones 5 to 7 wait.

**Owner tasks and open decisions**

- Final game name, app id and app icon (`capacitor.config.ts` has placeholders).
- Approve the AdMob plugin for Milestone 6, and supply the AdMob IDs.
- Publish a privacy policy and replace the placeholder URL in `SettingsScene.ts`.
- Install Android Studio and a test phone for Milestone 5 and the 60 fps check.

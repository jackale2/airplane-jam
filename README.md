# Airplane Jam

A calm, satisfying one-thumb puzzle: tap planes to taxi them out of a crowded apron, park them at gates, and watch matching-color travelers hop aboard. Phaser 3 + TypeScript + Vite, packaged for Android and iOS with Capacitor, and playable in any browser (installable, works offline).

## What is in the game

- **Core puzzle:** 100 hand-checked levels plus endless generated ones. Every level is verified solvable; no timers.
- **World tour:** a scrolling map with 10 destinations (a new city every 20 levels), 1 to 3 stars per level, HARD levels every 10th level that pay double, and a postcard for each city.
- **Zen mode:** endless calm boards with no way to lose (unlocks after level 6).
- **Daily loop:** a 7-day gift calendar, 3 daily missions with a bonus chest, and 10 achievements with tiers.
- **Cosmetics shop:** plane liveries, traveler outfits and airport themes, all bought with coins earned in play.
- **Boosters:** Gate, Sort and Shuffle, unlocked at levels 4, 7 and 10 with free samples.
- **ASMR feel:** generative lo-fi music per destination, boarding pops tuned to the music's key, bells and whooshes, gentle haptics, squash-and-stretch animations.
- **Every screen:** phones (portrait), tablets (portrait and landscape), foldables and desktops; the board turns sideways when that gives bigger cells. Mouse, touch and keyboard (Esc pause, R restart, 1/2/3 boosters, Enter confirms).
- **Accessibility:** color symbols (on by default), reduced motion, separate music and sound volumes.
- **No ads and no purchases at launch.** The ad and purchase code is kept but switched off (`src/data/tuning.ts`).

Design notes: `docs/ART_DIRECTION.md` (genre research and look), `Airplane Jam Game PRD and Build Plan.md` (rules, economy and decisions log).

## Run

```
npm install
npm run dev          # http://localhost:5173  (dev flags: ?fresh  ?level=40  ?coins=5000)
npm run test:fast    # unit tests without the slow 200-level generator test
npm test             # everything (the 200-level test takes a few minutes)
npm run build        # production web build in dist/ (installable PWA, works offline)
npm run check:levels # validate the shipped level data
npm run gen:art      # regenerate the plane and traveler SVGs in public/assets
```

## Android

Every push to `main` builds a debug APK in GitHub Actions (`.github/workflows/android.yml`); download it from the run's **airplane-jam-debug-apk** artifact.

Local build (JDK 21 and the Android SDK): `npm run cap:sync`, then `cd android && ./gradlew assembleDebug`.

### Release build (Google Play)

1. Create an upload keystore once and keep a backup:
   `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
2. In GitHub, add repository secrets: `ANDROID_KEYSTORE_BASE64` (output of `base64 -w0 upload.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
3. Run the workflow: it also builds a signed **app-release.aab** (artifact **airplane-jam-release-aab**). The version code is the workflow run number.

Before the first upload, set the final app id (see `ASSETS_TODO.md`).

## iOS

`ios/` holds the Capacitor Xcode project. On a Mac: `npm run cap:sync`, then `npm run cap:open:ios`. iPhones run in portrait; iPads in every orientation.

## Store assets

- Listing text, category, rating and data-safety answers: `docs/STORE_LISTING.md`
- Privacy policy page to host: `docs/privacy-policy.html`
- Screenshots and the 1024 x 500 feature graphic: `store/` (regenerate with `npm run dev` running, then `npm run store:shots`)

See `ASSETS_TODO.md` for the few things only the owner can do, and `CREDITS.md` for asset credits.

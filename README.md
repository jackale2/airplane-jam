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
npm run dev          # http://localhost:5173  (dev flags: ?fresh  ?level=40  ?coins=5000  ?renderer=canvas)
npm run test:fast    # unit tests without the slow 200-level generator test
npm test             # everything (the 200-level test takes a few minutes)
npm run build        # production web build in dist/ (installable PWA, works offline)
npm run check:levels # validate the shipped level data
npm run gen:art      # regenerate the plane and traveler SVGs in public/assets
```

## Android

Every push to `main` (and every manual run of **Actions > Android > Run workflow**) builds in GitHub Actions (`.github/workflows/android.yml`):

- **airplane-jam-debug-apk**: a debug APK to install on a phone for testing.
- **airplane-jam-release-aab**: the signed `app-release.aab` for Google Play, once the signing secrets below are set. Without them you get **airplane-jam-release-aab-unsigned**, which Play does not accept.

The version code is the workflow run number. Local build (JDK 21 and the Android SDK): `npm run cap:sync`, then `cd android && ./gradlew assembleDebug`.

### Release signing and settings (GitHub > Settings > Secrets and variables > Actions)

| Name | Kind | What |
| --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | secret | your upload keystore, base64 (`base64 -w0 upload.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | secret | keystore password |
| `ANDROID_KEY_ALIAS` | secret | key alias, for example `upload` |
| `ANDROID_KEY_PASSWORD` | secret | key password |
| `PLAY_GAMES_APP_ID` | variable | Google Play Games project id; turns on cloud save |
| `LEGAL_URL` | variable | where `public/legal/` is hosted; turns on the Privacy and Terms links |

Create the upload keystore once and back it up: `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`. The whole Google Play walkthrough is `docs/PLAY_RELEASE.md`.

## iOS

`ios/` holds the Capacitor Xcode project. On a Mac: `npm run cap:sync`, then `npm run cap:open:ios`. iPhones run in portrait; iPads in every orientation.

## Store assets

- Google Play listing, ready to upload: `fastlane/metadata/android/en-US/` (text, icon, feature graphic, phone and tablet screenshots)
- Play Console walkthrough and form answers (content rating, data safety, target audience, Play Games setup): `docs/PLAY_RELEASE.md`
- Listing text for both stores: `docs/STORE_LISTING.md`
- Privacy policy, terms of use and support pages to host: `public/legal/`
- Screenshots and the 1024 x 500 feature graphic: `store/` (regenerate with `npm run dev` running, then `npm run store:shots`)

See `ASSETS_TODO.md` for the few things only the owner can do, and `CREDITS.md` for asset credits.

# Airplane Jam

Portrait one-thumb puzzle game: tap planes to taxi them out of a crowded apron and load matching-color passengers. Phaser 3 + TypeScript + Vite, packaged for Android and iOS with Capacitor.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (the 200-level generator test takes a few minutes)
npm run build      # production build in dist/
npm run check:levels   # dev validator for the level data
```

## Android APK

Every push to `main` builds a debug APK in GitHub Actions (`.github/workflows/android.yml`).
Open the run in the **Actions** tab and download the `airplane-jam-debug-apk` artifact, or run the workflow by hand with **Run workflow**.

Local build (needs JDK 21 and the Android SDK): `npm run cap:sync`, then `cd android && ./gradlew assembleDebug`.

## iOS

`ios/` holds the Capacitor Xcode project (open on a Mac with `npx cap open ios`). The app icon is already in its asset catalog.

See `Airplane Jam Game PRD and Build Plan.md` for the design and the decisions log, and `CREDITS.md` for asset credits.

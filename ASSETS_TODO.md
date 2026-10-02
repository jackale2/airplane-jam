# Assets and owner tasks before release

Only the owner can do these. Everything else for v1.0 is in the repo.

- **Final name and app id.** the id is now `com.codeccraft.airplanejam` (set in `capacitor.config.ts` and `android/app/build.gradle`). It can never change after the first upload.
- **Privacy policy URL.** Host `docs/privacy-policy.html` (GitHub Pages works), put your support email in it, and paste the URL into `PRIVACY_URL` in `src/ui/dialogs.ts` and into both store listings.
- **Release signing.** Create an upload keystore and add the four GitHub secrets listed in `README.md` so the release workflow builds a signed `.aab`. Back the keystore up.
- **Store pages.** Text is drafted in `docs/STORE_LISTING.md`. Screenshots and the 1024 x 500 feature graphic are in `store/` (regenerate with `npm run store:shots`).
- **Optional music file.** The game makes its own calm music. To use a recorded track instead, add `public/assets/audio/music/music.ogg`; it is picked up automatically.
- **AdMob.** Ads are on. Set up the UMP consent message (AdMob > Privacy & messaging), add `app-ads.txt` on your developer website, and declare ads + advertising ID in the Play data safety form. Purchases stay off (`TUNING.purchasesEnabled`).

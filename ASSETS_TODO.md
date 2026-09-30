# Assets and owner tasks before release

Only the owner can do these. Everything else for v1.0 is in the repo.

- **Final name and app id.** `capacitor.config.ts` still has `com.example.airplanejam`. Google Play rejects `com.example` ids, and the id can never change after the first upload. Pick one (for example `com.yourstudio.airplanejam`), then run `npx cap sync`.
- **Privacy policy URL.** Host `docs/privacy-policy.html` (GitHub Pages works), put your support email in it, and paste the URL into `PRIVACY_URL` in `src/ui/dialogs.ts` and into both store listings.
- **Release signing.** Create an upload keystore and add the four GitHub secrets listed in `README.md` so the release workflow builds a signed `.aab`. Back the keystore up.
- **Store pages.** Text is drafted in `docs/STORE_LISTING.md`. Screenshots and the 1024 x 500 feature graphic are in `store/` (regenerate with `npm run store:shots`).
- **Optional music file.** The game makes its own calm music. To use a recorded track instead, add `public/assets/audio/music/music.ogg`; it is picked up automatically.
- **Later updates.** Ads (AdMob) and purchases (coin packs, Remove Ads) are coded but switched off (`TUNING.adsEnabled`, `TUNING.purchasesEnabled`). Turning them on needs an AdMob account, the consent form, store products, and an updated privacy policy and data safety form.

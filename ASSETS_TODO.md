# Owner tasks before release

Everything else for v1.0 is in the repo. The full walkthrough, with answers for every Play Console form, is `docs/PLAY_RELEASE.md`.

- **Host the legal pages** in `public/legal/` (privacy, terms, support) and set the repository variable `LEGAL_URL` to their folder URL.
- **Upload key.** Create it with `keytool` and add the four signing secrets, so the Android workflow builds a signed `.aab`. Back the key up.
- **Google Play Games.** Create the Play Games Services project, add credentials (SHA-1 of the app signing key and the upload key), turn on Saved Games, and set the repository variable `PLAY_GAMES_APP_ID`.
- **Play Console forms**: content rating, target audience, data safety, store listing (files in `fastlane/metadata/android/en-US/`).
- **Real-device test** through Internal testing, then the closed test that new developer accounts need (12 testers, 14 days).
- **Optional music file.** The game makes its own calm music. To use a recorded track instead, add `public/assets/audio/music/music.ogg`.
- **Later updates.** Ads (AdMob) and purchases are coded but switched off (`TUNING.adsEnabled`, `TUNING.purchasesEnabled`). Turning them on needs an updated privacy policy, data safety form and ads declaration.

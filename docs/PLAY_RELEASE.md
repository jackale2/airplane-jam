# Publishing Airplane Jam on Google Play

Everything the Play Console asks for, in the order it asks. The game side is done; the steps below need your accounts.

- Package name: **com.jackale2.airplanejam** (permanent)
- Developer: **jackale2**, support email **alidioow@gmail.com**
- Listing text and images: `fastlane/metadata/android/en-US/` (paste the text files, upload the images)
- Legal pages: `public/legal/` (privacy, terms, support), shipped with the web build

## 1. Host the legal pages

Play needs a public privacy policy URL. The pages are plain HTML in `public/legal/`; any static host works:

- **GitHub Pages**: needs a public repository (or a paid GitHub plan for private ones); it would then need a small workflow that publishes the web build, after which the pages live at `https://jackale2.github.io/airplane-jam/legal/`.
- **Any static host** (Vercel, Netlify, Cloudflare Pages, Firebase Hosting): upload the `public/legal` folder, or deploy the whole web build (`npm run build`, folder `dist/`), which includes `/legal/` and also gives you a playable web version.

Then set the repository variable **LEGAL_URL** (Settings > Secrets and variables > Actions > Variables) to the folder URL without a trailing slash, for example `https://airplane-jam.example.app/legal`. The next build turns on the Privacy and Terms buttons in Settings > Privacy.

URLs for the Play Console: `<LEGAL_URL>/privacy.html` (privacy policy), `<LEGAL_URL>/support.html` (website, optional), `<LEGAL_URL>/terms.html` (terms, if asked).

## 2. Upload key and signed builds

Google Play needs the `.aab` signed with your **upload key**. Create it once and keep it safe (Play App Signing holds the real app signing key; a lost upload key can be reset through Play support, but it takes days).

```sh
keytool -genkeypair -v -keystore airplane-jam-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
# base64 for the GitHub secret (macOS: base64 -i airplane-jam-upload.jks)
base64 -w0 airplane-jam-upload.jks > keystore.b64
```

Add these repository **secrets** (Settings > Secrets and variables > Actions > Secrets):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | the key password (same as the keystore password unless you chose another) |

Then run **Actions > Android > Run workflow**. The artifact `airplane-jam-release-aab` contains `app-release.aab`, signed and ready to upload. Without the secrets the workflow still builds the bundle, but unsigned (artifact `airplane-jam-release-aab-unsigned`), which Play rejects.

Every run uses the run number as the version code, so each upload is newer than the last.

## 3. Create the app in Play Console

Create app > App name **Airplane Jam: Airport Puzzle** (or Airplane Jam), default language English (United States), **Game**, **Free**, accept the declarations.

## 4. App content (Policy > App content)

| Section | Answer |
| --- | --- |
| Privacy policy | `<LEGAL_URL>/privacy.html` |
| App access | All functionality is available without special access |
| Ads | No, the app does not contain ads |
| Advertising ID | No, the app does not use the advertising ID (it has no AD_ID permission; the only permissions are internet and vibration) |
| Content rating | See below |
| Target audience | Ages **13 to 15, 16 to 17, 18 and over** (see the note below) |
| News app | No |
| Data safety | See below |
| Government app | No |
| Financial features | None |
| Health | None |

**Target audience note:** the game is family-friendly, but choosing ages under 13 puts it under the Families policy, which adds requirements for every SDK in the app (including Google Play Games) and for the listing. Starting with 13+ is the simple path; the content rating still shows the game as suitable for everyone.

### Content rating questionnaire (IARC)

Category: **Game**. Answer **No** to everything: violence, blood, sexuality, nudity, crude humor, profanity, drugs, alcohol, tobacco, gambling or simulated gambling, fear or horror, discrimination. Users interacting or sharing content: **No** (no chat, no user content). Shares location: No. Digital purchases: No. Expected result: **Everyone / PEGI 3 / USK 0**.

### Data safety

The game itself has no analytics, ads or servers. The only data that leaves the device is the optional Play Games cloud save, which the app writes to Google Play Games Saved Games for the signed-in player. Suggested answers:

- Does your app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes**
- Do you provide a way for users to request that their data be deleted? **Yes** (Reset progress in the game overwrites it; Play Games data can be deleted in the Play Games app)
- Data types collected:
  - **App activity > Other actions** (game progress): collected, **not shared**, **optional** (players can decline Play Games sign-in), purpose **App functionality**.
- Data shared: **None**.

Google's SDK-level disclosures for Play Games Services may add items; check the Play Console help page on Data safety for Google Play services SDKs before submitting, and match what it lists for Play Games Services v2.

## 5. Store listing (Grow > Store presence > Main store listing)

From `fastlane/metadata/android/en-US/`:

- App name: `title.txt` (28 of 30 characters)
- Short description: `short_description.txt` (78 of 80)
- Full description: `full_description.txt`
- App icon: `images/icon.png` (512 x 512)
- Feature graphic: `images/featureGraphic.png` (1024 x 500)
- Phone screenshots: `images/phoneScreenshots/1-5.png` (1080 x 1920)
- 7-inch tablet screenshots: `images/sevenInchScreenshots/1-5.png` (1600 x 2560)
- 10-inch tablet screenshots: `images/tenInchScreenshots/1-5.png` (2048 x 2732)
- Category: **Puzzle**; tags: Puzzle, Casual, Relaxing (pick what Play offers)
- Contact email: alidioow@gmail.com; website (optional): `<LEGAL_URL>/support.html`
- Release notes for the first release: `changelogs/default.txt`

## 6. Google Play Games cloud save

The game backs up progress to Play Games Saved Games once this is set up. Until then it plays normally with a device-only save.

1. Play Console > **Grow > Play Games Services > Setup and management > Configuration**: choose "No, my game doesn't use Google APIs", create the Play Games Services project.
2. **Credentials** > Add credential > Android, package `com.jackale2.airplanejam`. Use the SHA-1 of the **app signing key** (Release > Setup > App integrity > App signing). Add a second credential with the SHA-1 of your **upload key** (`keytool -list -v -keystore airplane-jam-upload.jks -alias upload`) so builds you install yourself can sign in too.
3. In the Play Games **Properties**, turn **Saved Games** on.
4. **Testers**: add your Google account (and testers) while the configuration is unpublished; publish the Play Games configuration with your first release.
5. Copy the **Project ID** (a long number on the Configuration page) into the repository **variable** `PLAY_GAMES_APP_ID`, then run the Android workflow again.

In the game: Settings > Cloud save shows the Play Games name when signed in, or a Sign in button. The save syncs at launch (a newer cloud save, such as from an old phone, is restored), at most once a minute while playing, and whenever the app goes to the background.

## 7. Test, then release

1. **Testing > Internal testing**: create a release, upload `app-release.aab`, add yourself as a tester, install from the opt-in link, and check sign-in, cloud save, sound and vibration on a real phone.
2. **Closed testing**: new personal developer accounts must run a closed test with at least 12 testers for 14 days before they can apply for production access. Start it early.
3. **Production**: promote the tested release, choose countries, and send for review.

## Updating later

Bump `versionName` in `android/app/build.gradle` (the version code updates itself), run the workflow, upload the new `.aab`. If you ever add ads or purchases, update the privacy policy, the Data safety form and the Ads declaration first.

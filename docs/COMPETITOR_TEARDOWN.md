# Bus Fever teardown: what drives play time and money

Target: **Bus Fever – Car Parking Jam** v1.19.7 (`com.bus.fever.car.parking.jam.color.match3d.puzzle.games`, versionCode 61), from the `.xapk`. Unity 2022.3.62f2, IL2CPP, arm64.

Method: unpacked the XAPK; dumped IL2CPP class/field/method names (Il2CppDumper); read the game's own data tables (a plain TABTOY file inside the asset bundles, 58 tables parsed); disassembled the haptics code; scanned the native code for who calls what; listed the SDK packages in the dex files.

Labels: **[observed]** = read directly from a table, the class dump, a disassembly or a cross-reference. **[inferred]** = my reading of observed facts. Static analysis never ran the game, so nothing here is a measured install or revenue number.

> **`bus-fever.apk` is not a game.** It is `com.aptoide.android.aptoidegames` 1.21.3, the Aptoide Games app store client. It was not used. Everything below comes from the XAPK.

---

## 1. How they got big players numbers

Install counts cannot be measured from a binary. What can be read is the machine they built to buy and keep players.

1. **Paid acquisition tuned on lifetime value, not installs** [observed]. Adjust is the attribution SDK; the game keeps a table of 98 named events with a per-platform (Google, iOS, Amazon) Adjust token each. Their ad campaign names embed `CPE_Install`, `CPE_Purchase`, `CPE_Reward`, `AdROAS`, `IAPROAS` and `BLDROAS` (blended ROAS), plus custom events such as `CPE_7d_maxlevel_N`, `CPE_7d_levelspendtime_N` and `CPE_7d_StartTimes_*`. [inferred] These are "cost per event" signals: the ad networks are told which day-7 behaviours (level reached, time spent, sessions) mark a valuable player, and bid for lookalikes. Facebook, TikTok and Google/Firebase events are also wired in.
2. **Revenue is reported back per ad impression** [observed]: `OnInterstitial/Rewarded/Banner/MRec/AppOpenAdRevenuePaidEvent` hooks, `trackAdRevenue`, a `Total_Ads_Revenue_001` event and `ad_impression`/`ad_revenue` events. [inferred] Every ad dollar a player generates is fed to the ad networks so campaigns optimise for return on ad spend.
3. **About 20 ad networks bid for each impression** [observed from the dex]: AppLovin MAX is the mediator, with Google, Meta, Unity Ads, ironSource, Pangle/ByteDance, Mintegral, Moloco, Fyber, Smaato, PubNative, BidMachine, Vungle, Chartboost, InMobi, HyprMX, Amazon APS and others. [inferred] More bidders per impression means a higher price per impression, which pays for more user acquisition.
4. **They ship on three stores with one code base** [observed]: every shop item has a Google, an Amazon and an Apple product id; the A/B tests are split by platform.
5. **Constant live testing** [observed]: 36 A/B test definitions in the data (2024-12 to 2026), nine parallel level-difficulty variants (`levelconfig_abtest…`) and ten ad-control variants. See section 6.

## 2. The core that makes it fun

[observed] It is a "bus jam" sort: passengers wait in colored queues; the player taps a colored vehicle to send it to a stop; a vehicle only departs when its color matches the front of the queue. Parking slots are scarce (`FreeCarPlace` = 4 in all 56,000 level rows), and the queue is generated from weighted tables (`ColorBaseWeights`, `CarColorWeights`, `QueueSplitWeights`, `QueueRearrangeWeights`, `CarNumShuffle`). Boosters: undo, exchange, shuffle, expansion; plus revive.

[inferred] Why it holds players:
- **One-tap rules, a planning puzzle underneath.** The first levels teach with 4 colors and 4 slots; mistakes are visible and fixable (undo is unlocked at level 4).
- **Near-miss losses.** You fail when slots clog, not by a timer (timer levels are only 2,730 of 56,000 rows), so every loss feels avoidable and "one more try" is cheap.
- **Constant micro-rewards.** Nearly every action has a sound, a particle and a haptic pulse (section 3); coins fly to the counter; progress bars fill.
- **A new system every few levels** (section 5) so the game never feels the same for long.

## 3. Haptics (the part you asked to copy) — **observed, fully decoded**

Code path: `GameVibration.Vibrate(id)` → looks up row `id` in table `vibration` → `Vibration` (Unity free asset) wrapper over Android `Vibrator`.

Table `vibration` (9 rows):

| id | Effect | IntensityAndroid (amplitude 1-255) | Time (ms) | IntensityIos |
|---|---|---|---|---|
| 1 | 1 | 120 | 20 | 2 |
| 2 | 6 | 30 | 10 | 4 |
| 3 | 1 | 120 | 20 | 2 |
| 4 | 0 | 200 | 50 | 0 |
| 5 | 6 | 30 | 10 | 4 |
| 6 | 4 | 80 | 20 | 1 |
| 7 | 2 | 150 | 30 | 2 |
| 8 | 2 | 80 | 20 | 2 |
| 9 | 1 | 120 | 20 | 3 |

Android decision (disassembled): if the vibration setting is on and the device has a vibrator → if API ≥ 29 and `Effect ≥ 1`: `VibrationEffect.createPredefined(Effect − 1)`; else if API ≥ 26 and amplitude ≥ 1: `createOneShot(Time, amplitude)`; else `vibrate(Time)`. Predefined ids: 0 click, 1 double click, 2 tick, 5 heavy click.

Which game event fires which row (found by scanning every call to `Vibrate`):

| id | Event |
|---|---|
| 1 | every button press (`OnPointerWithSoundClick`) |
| 2 | a passenger walks onto a bus |
| 3 | tapping a vehicle |
| 4 | level won, level lost, win-star animation finished |
| 5 | coins or items flying to the counter |
| 6 | win-box open, key-challenge progress |
| 7 | tapping the bus-fever platform |
| 8 | home-screen activity animation |
| 9 | a vehicle reaches its stop |

"Matched" pattern (`VibrateRepeatForMatched`): a waveform of pulses at 30, 45, 30, 45, 30 ms (on/off alternating), no repeat. All haptics are gated by one player setting.

[inferred] The feel comes from **many small distinct pulses** (10-50 ms) with different strengths, not from one long buzz: light for UI, medium for tap/arrive, strong only for win/lose.

**Ported:** `src/systems/haptics.ts` (table + lookup), a native Android plugin `AmplitudeHapticsPlugin` (amplitude/predefined/waveform), wired into `AudioManager.haptic`.

## 4. The "bubble" (reward bubble) — **observed**

In their code "bubble" is the **reward preview speech bubble**: `CommonBubbleItems`, `ShowRewardBubble`, `ShowNextDayRewardBubble`, `SHOW_ITEM_BUBBLES_UP/DOWN`, `SHOW_WHEEL_BUBBLE`. Tapping a chest, a daily-reward day or a wheel slot pops a small white rounded bubble with an arrow (up or down) showing what is inside. The show animation (`animation_bubble_show`) decoded from its curves: scale X and Y go 0 → 1 with a cubic ease-in-out (smoothstep) over **0.267 s**, Z stays 1.

[inferred] It is a cheap trust-and-desire tool: showing the prize before the tap makes the next reward feel worth earning, and it replaces a full popup.

**Ported:** `src/ui/bubble.ts`, used on the daily gift days and mission chest.

## 5. Retention structure

### Feature unlock ladder (`unlock` table) [observed]

Level at which each system opens (Android column): starter pack 5, piggy bank 5, decorate 5, undo item 4, exchange 6, key challenge 6, passenger club 6, limited gift 6, shuffle 7, lucky spin 10, expansion item 10, no-ads gift 10, VIP 10, leaderboard 10, balloon race 10, level race 11, super mover 11, pass 15, pick-one 20, daily deal 20, endless sale 20, hidden treasure 20, one-plus-one 20, fever gift 20, win streak 25, trophy rush 25, space treasure 25, daily challenge 30, temple gold 30, jungle adventure 30, pack collection 50, pay-free playon 50.
[inferred] A new reason to open the app roughly every 1-5 levels for the first 30 levels.

### Daily and event layers [observed]
Daily reward, 7+ day pass tracks (`pass` 63 steps, `pass_new` 22), win-streak ladder (1, 2, 3, 5, 7, 10, 15 wins, the last paying 200 coins + boosters), lucky spin (24 weighted slots), trophy rush (50), weekly rush, key challenge (75), hidden treasure (30), space treasure (46), circus quest (24), decorate/build-a-scene meta (63 build items), card-pack collection (135 items), seasonal skins (Halloween, Christmas, Thanksgiving, Valentine, Summer…), passenger club, name bank (1,760 names), balloon race, level race.

### Difficulty control [observed table, inferred meaning]
- 8,000 main levels, each with **7 variants** (ids like 101…107) [observed: 56,000 rows]. 11,200 rows (1,600 levels' variants) are flagged `HighDiffLevel`.
- `level_difficulty_control` holds score deltas: type 1 (wins, +50…+500 by streak 1-5 and level 1-8001), type 2 (fails, e.g. levels 1-15: −500 and −1000; levels 16-100: −50, −300, −1000, −3000; 101+: down to −3000), type 3 (small penalties −10…−300, per counted event), type 4 (+500 at fixed level bands). `globalconfig` has `BaseScore` thresholds 300/750/1500/3000/6000/7000 and per-level caps.
- [inferred] **Dynamic difficulty**: a hidden skill score rises on wins and falls on fails; the score picks which of the 7 variants the player gets next. Early levels punish failure hardest, meaning a struggling new player is made easier fast.
- **Ported (adapted):** after repeated fails on a level you now get a free Gate booster (`TUNING.assist`).

## 6. Monetization and ads

### Ad control (`ad_control`, 21 variants) [observed]
Per variant: interstitial, rewarded and banner unit; `InterAdsShow` (e.g. `[[1,2]]`, `[[1,10]]`, `[[1,20],[3,1]]`); `InterAdsCD` cooldown bands by level, in seconds, e.g. `[[1,300],[4,300],[50,120],[200,30]]` (variant 1) or `[[4,600],[50,240],[200,120],[500,30]]` (variant 101); `RvAdsLoad`; `InterBanSession` (e.g. `[1,10]`); banner from level 1.
- [inferred] The cooldown **shrinks as the player gets deeper** (300 s early → 30 s at level 200+), so engaged players see more ads and new players are protected. The meaning of `InterAdsShow` and `InterBanSession` is **unresolved** (best guess: show every N levels after a start level; no interstitial in a number of early sessions) and was not copied.
- **Ported:** interstitial cooldown bands by level (`TUNING.interstitial.gapByLevel`).

### Rewarded-video limits by spending tier (`rewardvideo_limit_control`, 18 rows) [observed]
Rows are selected by lifetime spend (`TotalPayRange`): $0-0.5, $0.51-10, $10+. For each tier and level band there are caps on rewarded videos per level for revive, for item refills and for free rewards; `-1` = no limit. Spenders (>$10) get `LevelItemRvLimit` 0 and revive cap 1; non-spenders get more offers. [inferred] They sell players who pay (in-app) a cleaner game and keep ad offers for people who do not.
Other rewarded hooks [observed]: a "reward meter" (1, 4, 9 videos unlock bigger chests), `RvGoldReward` (30/50/80/60/40 coins), `RvEventReward`, free coins `RewardvideoFreeCoin` 30.

### In-app purchases (`shopconfig`, 45 rows) [observed]
Price ladder $0.99, 3.99, 9.99, 14.99, 29.99, 49.99 (coin packs 300/1,400/4,000/7,000/16,000/30,000); bundles at 4.99 (beginner), 9.99, 14.99, 29.99, 49.99, 99.99; remove ads $7.99 (and a bundle at $8.99); journey pass $6.99; piggy bank $4.99/9.99/19.99 (stored coins you pay to break); lucky spin $0.99; VIP 7-day $4.99; four starter-pack tiers whose config carries day ranges 3-7, 8-30, 31-90 and 91+ with growing rewards [inferred: ranges are days since install].
[inferred] Revenue is a mix: ads for the many, a steady $5-10 first purchase for the few, a very long tail up to $99.99. Your launch has `purchasesEnabled: false`, so none of this is ported; see "when IAP is on" below.

### Economy numbers [observed]
Start items: 500 coins and 3 of each booster; free hearts, 15-60 minute heart refills; booster prices undo 30, exchange 100, free-up 240, shuffle 300 coins; revive 300 coins, ambulance revive prices 300-500; revive price steps 400-2,000.

## 7. What data they collect and calculate

[observed] On the device: Adjust (attribution, install referrer, advertising id, session tracking, ad revenue), Firebase Analytics and Crashlytics (Remote Config classes are in the SDK, but I did not trace their use), ByteDance APM, Facebook/TikTok app events, Unity Services, UMP consent. Manifest permissions include `AD_ID`, `ACCESS_ADSERVICES_*` (the Android privacy-sandbox ad APIs) and `POST_NOTIFICATIONS`.
Event list (98 names): start/exit/retry/win/fail game, revive, use/get tools, get/use coins, ad shown (rewarded/interstitial) and *no ad loaded*, purchase click/success/by product, onboarding steps `Guide01…06`, `ShowWinGameLevelN` for N at 1, 2, 3, 4, 5, 10, 15 … 5,000, `WatchRewardedVideoN` for N at 1, 5, 10, 20, 30, 40, 50, 75, 100, event reached/finished, card-pack opens, first game scene open.
[inferred] Calculated from them: funnel drop-off per onboarding step, level-reached milestones (to value a player for ad buying), watch-count milestones (to find ad-tolerant players), ad revenue per user, spend tier (to pick the rewarded-video limit row), days since install (to pick the starter pack), and A/B group.
**A/B assignment** [observed fields]: each test has a name, platform, group count and percentage split, a numeric `Salt`, a start and end time, and a persistence time of 4-10 days. [inferred] The group is a stable hash of a device id and the salt, so the same player always lands in the same group, and a result can be compared per group.

## 8. What I ported into this game

| Area | Change | Where |
|---|---|---|
| Haptics | Their 9-row amplitude table (boarding and coin rows softened from HEAVY_CLICK to a 10 ms, amplitude-30 pulse because they chain quickly; restore with `effect: 5, ios: 4` in `HAPTIC_ROWS` rows 2 and 5), mapped to your events; native Android plugin (one-shot with amplitude, predefined effect, waveform) with the old Capacitor path as fallback | `src/systems/haptics.ts`, `android/…/AmplitudeHapticsPlugin.java`, `AudioManager.haptic` |
| Bubble | Reward bubble (smoothstep pop-in, 267 ms, up/down arrow) | `src/ui/bubble.ts` |
| Sound | Their original sound clips layered over your synth for UI click, popups, coins, win/lose, star, boarding pop (pitched to your scale), unlock, shuffle | `public/assets/sfx/`, `AudioManager` |
| Ads | Interstitial cooldown bands by level | `TUNING.interstitial`, `AdsManager` |
| Retention | Win-streak ladder (3, 5, 7, 10, 15 wins in a row on the frontier level) with coin and booster prizes | `TUNING.winStreak`, `MetaManager` |
| Difficulty | Mercy after repeated fails on the current level (from level 4, when Gate unlocks): a free Gate booster | `TUNING.assist`, `MetaManager` |
| Measurement | Event layer with their event names and milestone events (levels reached, rewarded videos watched); stays on the device until you add an SDK | `src/systems/analytics.ts` |

### Deliberately not ported
- **A/B testing framework:** needs a remote config server; without one it would be dead code. Their scheme is in section 7 for when you add Firebase Remote Config.
- **Analytics SDK (Firebase/Adjust):** adds data collection, which changes your published privacy policy and Play Data Safety form. Add it together with that update and only after the existing UMP consent.
- **Piggy bank, pass, VIP, starter packs, spin purchases, remove-ads bundle:** all need IAP (`purchasesEnabled: false`). Plan: when IAP turns on, add remove-ads at about $4.99-7.99, a starter pack at $4.99, a piggy bank with stored coins at $4.99, and a pass at $6.99, tiered by days since install.
- **Their ad unit ids, Adjust tokens and A/B salt** are deliberately not copied anywhere.

## 9. Asset provenance

You chose to reuse their original sound clips. They are their copyrighted audio. They are listed in `CREDITS.md` with their source names so they can be swapped out for your own or licensed sounds **before a store release**; Google Play and Apple can remove an app that reuses another title's assets, and the rights holder can send a takedown. The synth fallback stays in place, so deleting `public/assets/sfx/` restores the original sound.

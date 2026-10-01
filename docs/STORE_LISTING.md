# Store listing (Google Play and App Store)

Draft text for the store pages. Lengths are checked against the store limits.

## Name

**Airplane Jam: Airport Puzzle** on Google Play (28 of 30 characters); **Airplane Jam** on the App Store

## Short description (Play, 80 characters max)

> Tap planes out of the jam and board every traveler. A calm, satisfying puzzle!

(78 characters)

## App Store subtitle (30 characters max)

> Relaxing airport puzzle game

## Full description (4000 characters max)

> Welcome to the busiest, friendliest airport in the world!
>
> Planes are jammed on the apron and travelers are waiting in line. Tap a plane to taxi it out to a gate, then watch passengers of the same color hop aboard one by one. When a plane is full it takes off with a happy whoosh. Plan your moves, keep a gate free, and clear the whole airport!
>
> WHY YOU WILL LOVE IT
> • One-thumb puzzles you can play anywhere, in a minute or two
> • Deeply satisfying: bubbly boarding pops, seat lights filling up, smooth takeoffs
> • Calm music made for relaxing, and soft sounds that follow every tap
> • Every level can be solved. No timers, no stress
> • Cute travelers with suitcases, backpacks and even a teddy bear
>
> FLY AROUND THE WORLD
> • Travel from Sunny Harbor to Paris, Tokyo, Cairo, New York, Rio, London, Amsterdam, Reykjavik and Nairobi
> • Earn up to 3 stars on every level and collect postcards from every city
> • HARD levels test your skills and pay double
>
> RELAX IN ZEN MODE
> • Endless calm boards with no way to lose
> • Just tap, listen and unwind
>
> MAKE IT YOURS
> • Plane liveries: Racer stripes, Polka Dot, Propeller planes and Jumbo jets
> • Traveler outfits: party hats, beach hats, bobble hats and crowns
> • Airport themes: Golden Hour, Starry Night, Snowfall and Cotton Candy
>
> COME BACK EVERY DAY
> • Daily gifts, three daily missions and a bonus chest
> • Ten achievements with many tiers to complete
>
> FAIR AND FRIENDLY
> • No ads and no purchases. Everything is earned by playing
> • Plays offline
> • Cloud save with Google Play Games: continue on a new phone
> • Color symbols for colorblind players, reduced motion and volume settings
> • Works on phones, tablets and Chromebooks, in portrait and landscape

## Category and tags

- Category: Puzzle (Play), Games > Puzzle (App Store). Secondary: Casual.
- Tags / keywords (App Store, 100 characters): `airplane,plane,puzzle,jam,parking,traffic,airport,relaxing,sort,color,match,brain,zen,casual,offline`

## Content rating, data safety and the rest of App content

Google Play answers (content rating, target audience, data safety, ads, app access) are in `docs/PLAY_RELEASE.md`. Play listing files ready to upload are in `fastlane/metadata/android/en-US/`.

## App Store privacy (iOS)

Data collected: **none** on iOS (no Play Games there; progress stays on the device). Privacy policy URL: `<LEGAL_URL>/privacy.html` (see `docs/PLAY_RELEASE.md` for hosting).

## Graphics

- App icon 512 x 512: `logos/export/icon-512.png`
- Feature graphic 1024 x 500: `store/feature-graphic-1024x500.png`
- Phone screenshots (1080 x 1920 for Google Play, 1242 x 2688 for the App Store) and tablet screenshots (1600 x 2560 for Google Play, 2048 x 2732 for iPad): `store/<device>-<n>-<screen>.png`, five per device in this order: gameplay, home, world map, Zen Mode, shop
- To regenerate after art changes: run `npm run dev`, then `npm run store:shots` (needs Playwright)

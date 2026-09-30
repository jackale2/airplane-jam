# Assets still to do

- Music: none supplied. Drop a file at `public/assets/audio/music/music.ogg` and it plays automatically (looped, respects the Music setting).
- Win and fail sounds: the Kenney UI audio pack only has clicks and switches, so win, fail, bump, taxi, takeoff, the boarding pop and the takeoff chime are synthesized in `AudioManager`. Replace with CC0 files in `public/assets/audio/sfx/` for something richer.
- Store graphics: 1024 x 500 feature graphic and screenshots for Google Play (the 512 x 512 icon is `logos/export/icon-512.png`).
- Final game name and app id: `capacitor.config.ts` still has the working title and a placeholder id (`com.example.airplanejam`).
- Privacy policy URL: `SettingsScene.ts` uses a placeholder link.
- Release signing: the workflow builds a debug APK. A signed release bundle needs your own keystore.

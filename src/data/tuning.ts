/** All balance numbers live here. */
export const TUNING = {
  seatsPerCell: 2, // seat capacity = seatsPerCell x plane length
  levelReward: 20,
  dailyReward: 50,
  boosterCost: { extraGate: 100, sortQueue: 100, shuffleBoard: 150 },
  sortQueueCount: 8,
  coinPacks: [
    { id: 'coins_small', coins: 500, label: 'Small Pack' },
    { id: 'coins_medium', coins: 1500, label: 'Medium Pack' },
    { id: 'coins_large', coins: 4000, label: 'Large Pack' },
  ],
  removeAdsId: 'remove_ads',
  interstitial: { fromLevel: 6, everyLevels: 3, minGapMs: 90_000 },
  taxiPxPerSec: 900,
  bumpMs: 200,
  boardMs: 100,
  takeoffMs: 600,
  startBoosters: { extraGate: 1, sortQueue: 1, shuffleBoard: 1 },
} as const;

export type BoosterId = keyof typeof TUNING.boosterCost;

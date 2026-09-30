/** All balance numbers live here. */
export const TUNING = {
  seatsPerCell: 2, // seat capacity = seatsPerCell x plane length
  levelReward: 20,
  starBonus: 10, // per star above one
  dailyReward: 50, // first win of the day
  destinationReward: 200, // arriving at a new destination (every 20 levels)
  zenBoardReward: 5,
  startCoins: 100,
  boosterCost: { extraGate: 100, sortQueue: 100, shuffleBoard: 150 },
  /** Continue after a deadlock: +1 gate for coins. The price doubles with each continue in the same level. */
  continueCost: 120,
  sortQueueCount: 8,
  coinPacks: [
    { id: 'coins_small', coins: 500, label: 'Small Pack' },
    { id: 'coins_medium', coins: 1500, label: 'Medium Pack' },
    { id: 'coins_large', coins: 4000, label: 'Large Pack' },
  ],
  removeAdsId: 'remove_ads',
  /** Launch build: no ads and no purchases. The managers stay in the code for a later update. */
  adsEnabled: false,
  purchasesEnabled: false,
  interstitial: { fromLevel: 6, everyLevels: 3, minGapMs: 90_000 },
  taxiPxPerSec: 1100,
  bumpMs: 220,
  boardMs: 140,
  takeoffMs: 700,
  startBoosters: { extraGate: 0, sortQueue: 0, shuffleBoard: 0 },
  boosterSample: 2, // free boosters granted when a booster unlocks
  zenMaxGates: 7,
} as const;

export type BoosterId = keyof typeof TUNING.boosterCost;
export const BOOSTER_IDS: BoosterId[] = ['extraGate', 'sortQueue', 'shuffleBoard'];

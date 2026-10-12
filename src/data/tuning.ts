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
  adsEnabled: true,
  purchasesEnabled: false,
  /**
   * Interstitial pacing. The studied game shortens the cooldown as the player goes deeper (300 s early,
   * 30 s past level 200); same idea, gentler numbers: [from level, minimum seconds since the last ad].
   */
  interstitial: { fromLevel: 6, everyLevels: 3, gapByLevel: [[6, 150], [30, 120], [100, 90], [200, 45]] as readonly (readonly [number, number])[] },
  /** Consecutive wins that pay a bonus (their win-streak ladder pays at 1, 2, 3, 5, 7, 10, 15). */
  winStreak: [
    { wins: 3, reward: { boosters: { extraGate: 1 } } },
    { wins: 5, reward: { coins: 100 } },
    { wins: 7, reward: { boosters: { sortQueue: 1 } } },
    { wins: 10, reward: { coins: 100, boosters: { shuffleBoard: 1 } } },
    { wins: 15, reward: { coins: 200, boosters: { extraGate: 1, sortQueue: 1, shuffleBoard: 1 } } },
  ] as readonly { wins: number; reward: { coins?: number; boosters?: Partial<Record<'extraGate' | 'sortQueue' | 'shuffleBoard', number>> } }[],
  /** Mercy: this many failed attempts in a row on one level earn a free Gate booster (their hidden difficulty score drops on fails). */
  assist: { failsForGate: 2 },
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

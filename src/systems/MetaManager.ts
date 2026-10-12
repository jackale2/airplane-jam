import { bandFor } from '../core/Generator.ts';
import { TUNING } from '../data/tuning.ts';
import { ACHIEVEMENTS, achievementView, type AchievementStat, type AchievementView } from '../meta/achievements.ts';
import { cosmetic, type CosmeticKind } from '../meta/cosmetics.ts';
import { dayKey } from '../meta/dates.ts';
import { destinationIndex, destinationsReached } from '../meta/destinations.ts';
import { applyMissionEvent, makeMissions, MISSION_BONUS, missionDone, missionText, type MetaEvent } from '../meta/missions.ts';
import { BOOSTER_UNLOCK, isHardLevel, totalStars, ZEN_UNLOCK, type Stars } from '../meta/progress.ts';
import { claimDaily, dailyAvailable, streakReward, type Reward } from '../meta/rewards.ts';
import type { EconomyManager } from './EconomyManager.ts';
import type { SaveManager } from './SaveManager.ts';

export interface MetaNotice {
  kind: 'mission' | 'achievement';
  text: string;
}

export interface LevelResult {
  stars: Stars;
  bestStars: number;
  firstClear: boolean;
  /** Set when this win unlocked the first level of a new destination. */
  arrived: number | null;
  /** Bonus paid for this win streak (already granted), if any. */
  streakBonus: Reward | null;
}

/** Stats, daily missions, achievements, the gift calendar and campaign progress. Tells the UI when badges change. */
export class MetaManager {
  private readonly save: SaveManager;
  private readonly economy: EconomyManager;
  private readonly listeners = new Set<() => void>();

  constructor(save: SaveManager, economy: EconomyManager) {
    this.save = save;
    this.economy = economy;
  }
  private get d() {
    return this.save.data;
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private changed() {
    this.save.save();
    this.listeners.forEach((fn) => fn());
  }

  // ---------- day rollover ----------

  /** Count the login day and deal today's missions. Safe to call often. */
  refreshDay(today = dayKey()) {
    let dirty = false;
    if (this.d.stats.lastLogin !== today) {
      this.d.stats.lastLogin = today;
      this.d.stats.loginDays++;
      dirty = true;
    }
    if (this.d.missions.date !== today) {
      const level = this.d.level;
      this.d.missions = {
        date: today,
        list: makeMissions(today, { level, colors: bandFor(level).colors[0], zen: this.zenUnlocked, boosters: level > BOOSTER_UNLOCK.extraGate }),
        bonusClaimed: false,
      };
      dirty = true;
    }
    if (dirty) this.changed();
  }

  get zenUnlocked() {
    return this.d.level > ZEN_UNLOCK;
  }

  // ---------- tracking ----------

  statValue(stat: AchievementStat): number {
    if (stat === 'stars') return totalStars(this.d.stars);
    if (stat === 'destinations') return destinationsReached(this.d.level);
    return this.d.stats[stat];
  }

  achievements(): AchievementView[] {
    return ACHIEVEMENTS.map((a) => achievementView(a, this.statValue(a.stat), this.d.achievements[a.id] ?? 0));
  }

  private claimableIds() {
    return new Set(this.achievements().filter((a) => a.claimable).map((a) => a.def.id));
  }

  /** Feed one gameplay event. Returns notices for missions and achievements it completed. */
  track(ev: MetaEvent): MetaNotice[] {
    const before = this.claimableIds();
    const s = this.d.stats;
    switch (ev.type) {
      case 'board':
        s.passengers++;
        if (ev.zen) s.zenPassengers++;
        break;
      case 'depart':
        s.planes++;
        break;
      case 'win':
        s.wins++;
        if (ev.stars === 3) s.perfect++;
        if (ev.hard) s.hardWins++;
        break;
      case 'chain':
        s.bestChain = Math.max(s.bestChain, ev.n);
        break;
      case 'booster':
        s.boostersUsed++;
        break;
      case 'zenBoard':
        s.zenBoards++;
        break;
    }
    const notices: MetaNotice[] = applyMissionEvent(this.d.missions.list, ev).map((m) => ({ kind: 'mission', text: `Mission done: ${missionText(m)}` }));
    for (const a of this.achievements()) {
      if (a.claimable && !before.has(a.def.id)) notices.push({ kind: 'achievement', text: `Achievement: ${a.def.name}` });
    }
    this.changed();
    return notices;
  }

  /** Record a campaign win: stars, unlocks, stats. */
  completeLevel(level: number, stars: Stars): { result: LevelResult; notices: MetaNotice[] } {
    const prev = this.d.stars[level] ?? 0;
    const firstClear = prev === 0;
    this.d.stars[level] = Math.max(prev, stars);
    let arrived: number | null = null;
    const prevLevel = this.d.level;
    if (this.d.level === level) {
      this.d.level = level + 1;
      const di = destinationIndex(level + 1);
      if (di !== destinationIndex(level) && !this.d.flags[`dest_${di}`]) {
        this.d.flags[`dest_${di}`] = true;
        arrived = di;
        this.economy.addCoins(TUNING.destinationReward);
      }
    }
    // streak and mercy only count on the frontier level: replaying old levels must not farm rewards
    const frontier = prevLevel === level;
    if (frontier) this.d.streak++;
    this.d.struggle = { level: 0, fails: 0 };
    const streakBonus = frontier ? streakReward(this.d.streak) : null;
    if (streakBonus) this.economy.grant(streakBonus);
    const notices = this.track({ type: 'win', stars, hard: isHardLevel(level) });
    return { result: { stars, bestStars: this.d.stars[level]!, firstClear, arrived, streakBonus }, notices };
  }

  /**
   * A fail (deadlock popup) ends the win streak. Failing the same level again and again earns a free Gate
   * booster (mercy); returns true when it was just granted.
   */
  failLevel(level: number) {
    this.d.streak = 0;
    if (level !== this.d.level || level < BOOSTER_UNLOCK.extraGate) {
      this.changed();
      return false; // replays earn no mercy, and a Gate booster is unusable before it unlocks
    }
    const s = this.d.struggle;
    s.fails = s.level === level ? s.fails + 1 : 1;
    s.level = level;
    const mercy = s.fails === TUNING.assist.failsForGate;
    if (mercy) this.economy.add('extraGate');
    this.changed();
    return mercy;
  }

  // ---------- claims ----------

  get missions() {
    return this.d.missions;
  }

  claimMission(i: number): Reward | null {
    const m = this.d.missions.list[i];
    if (!m || m.claimed || !missionDone(m)) return null;
    m.claimed = true;
    const r = { coins: m.reward };
    this.economy.grant(r);
    this.changed();
    return r;
  }

  get bonusReady() {
    const l = this.d.missions.list;
    return l.length > 0 && l.every((m) => m.claimed) && !this.d.missions.bonusClaimed;
  }

  claimMissionBonus(): Reward | null {
    if (!this.bonusReady) return null;
    this.d.missions.bonusClaimed = true;
    this.economy.grant(MISSION_BONUS);
    this.changed();
    return MISSION_BONUS;
  }

  claimAchievement(id: string): Reward | null {
    const a = this.achievements().find((x) => x.def.id === id);
    if (!a || !a.claimable) return null;
    this.d.achievements[id] = a.claimed + 1;
    const r = { coins: a.reward };
    this.economy.grant(r);
    this.changed();
    return r;
  }

  get dailyReady() {
    return dailyAvailable(this.d.daily, dayKey());
  }

  claimDaily(): Reward | null {
    const c = claimDaily(this.d.daily, dayKey());
    if (!c) return null;
    this.d.daily = c.next;
    this.economy.grant(c.reward);
    this.changed();
    return c.reward;
  }

  /** Red dots on the menu buttons. */
  get badges() {
    const missions = this.d.missions.list.filter((m) => missionDone(m) && !m.claimed).length + (this.bonusReady ? 1 : 0);
    const achievements = this.achievements().filter((a) => a.claimable).length;
    return { missions, achievements, trophies: missions + achievements, daily: this.dailyReady };
  }

  // ---------- cosmetics ----------

  owns(id: string) {
    return this.d.cosmetics.owned.includes(id);
  }

  equipped(kind: CosmeticKind) {
    return this.d.cosmetics[kind];
  }

  /** Buy (if needed and affordable) and equip. Returns false if the player cannot afford it. */
  buyOrEquip(id: string): 'equipped' | 'bought' | 'poor' | 'unknown' {
    const c = cosmetic(id);
    if (!c) return 'unknown';
    let bought = false;
    if (!this.owns(id)) {
      if (!this.economy.spend(c.price)) return 'poor';
      this.d.cosmetics.owned.push(id);
      bought = true;
    }
    this.d.cosmetics[c.kind] = id;
    this.changed();
    return bought ? 'bought' : 'equipped';
  }
}

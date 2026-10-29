import { Injectable, Logger } from '@nestjs/common';
import { tashkentDate } from '../conditions/weekend-window.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { SHIELD_STATUSES } from './streaks.constants.js';
import { StreaksRepository } from './streaks.repository.js';
import {
  activityFrom,
  addDays,
  evaluateStreaks,
  isShielded,
  missedWeeks,
  mondayOf,
  summarizeStreaks,
  type ActivityKind,
  type StreaksSummary,
} from './streaks.rules.js';

/** Flame and boot streaks with monthly freezes (features/streaks.md AC1, AC2, AC4, AC5). */
@Injectable()
export class StreaksService {
  private readonly logger = new Logger(StreaksService.name);

  constructor(
    private readonly repository: StreaksRepository,
    private readonly gameConfig: GameConfigService,
  ) {}

  /**
   * AC5: counts a lesson completion or accepted check-in on its Tashkent day, then re-evaluates.
   * Never throws: a streak failure must not fail the lesson or check-in that triggered it.
   */
  async recordActivity(
    userId: string,
    kind: ActivityKind,
    at: Date,
    now = new Date(),
  ): Promise<void> {
    try {
      const day = tashkentDate(at);
      await this.repository.addActivity(userId, day, kind);
      await this.evaluate(userId, now, day);
    } catch (error: unknown) {
      this.logger.error(
        { err: error, userId, kind, event: 'STREAK_RECORD_FAILED' },
        'STREAK_RECORD_FAILED',
      );
    }
  }

  getMine(userId: string, now = new Date()): Promise<StreaksSummary> {
    return this.evaluate(userId, now);
  }

  /**
   * AC3: the week starting `monday` is shielded when the user had places that weekend (path of
   * that Saturday's month + trips overlapping Sat/Sun) and every one was red on both days.
   */
  async isWeekShielded(userId: string, monday: string): Promise<boolean> {
    const saturday = addDays(monday, 5);
    const placeIds = await this.repository.weekendPlacesOf(userId, saturday);
    if (placeIds.length === 0) return false;
    const rows = await this.repository.weekendConditions(placeIds, [
      saturday,
      addDays(monday, 6),
    ]);
    return isShielded(monday, placeIds, rows, SHIELD_STATUSES);
  }

  /** AC3 job: records today's current status of every weekend place. Returns the rows written. */
  async recordWeekendConditions(now = new Date()): Promise<number> {
    const day = tashkentDate(now);
    const placeIds = await this.repository.weekendPlacesOn(day);
    if (placeIds.length === 0) return 0;
    const rows = await this.repository.currentStatuses(placeIds);
    await this.repository.saveWeekendConditions(day, rows);
    return rows.length;
  }

  /**
   * Lazy, idempotent evaluation under a per-user lock. Activity recorded for an already-evaluated
   * day (a queued check-in, a merged guest lesson) replays the evaluation from all activity days.
   */
  private async evaluate(
    userId: string,
    now: Date,
    recordedDay?: string,
  ): Promise<StreaksSummary> {
    const { freezesPerMonth } = await this.gameConfig.streaksConfig(
      now.getTime(),
    );
    const today = tashkentDate(now);
    const lastMonday = addDays(mondayOf(today), -7);
    return this.repository.locked(userId, async (store) => {
      let state = await store.findState();
      if (
        recordedDay !== undefined &&
        state?.evaluatedThrough != null &&
        recordedDay <= state.evaluatedThrough
      ) {
        await store.reset();
        state = null;
      }
      const from = activityFrom(state);
      const activity = await store.activitySince(
        from === null || from < lastMonday ? from : lastMonday,
      );
      const usedFreezes = await store.freezes();
      const shieldedWeeks = await this.shieldedWeeks(userId, [
        ...missedWeeks(state, activity, today),
        lastMonday,
      ]);
      const result = evaluateStreaks({
        state,
        activity,
        usedFreezes,
        shieldedWeeks,
        freezesPerMonth,
        today,
      });
      if (result.changed) await store.save(result.state, result.newFreezes);
      return summarizeStreaks({
        state: result.state,
        activity,
        freezes: [...usedFreezes, ...result.newFreezes],
        shieldedWeeks,
        freezesPerMonth,
        today,
      });
    });
  }

  private async shieldedWeeks(
    userId: string,
    mondays: readonly string[],
  ): Promise<Set<string>> {
    const shielded = new Set<string>();
    for (const monday of new Set(mondays)) {
      if (await this.isWeekShielded(userId, monday)) shielded.add(monday);
    }
    return shielded;
  }
}

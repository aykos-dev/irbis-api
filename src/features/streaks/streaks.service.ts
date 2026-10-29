import { Injectable, Logger } from '@nestjs/common';
import { tashkentDate } from '../conditions/weekend-window.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { StreaksRepository } from './streaks.repository.js';
import {
  activityFrom,
  addDays,
  evaluateStreaks,
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

  /** AC3 seam (streaks brief 2): whether bad weather shields the week starting `monday`. */
  readonly isWeekShielded: (
    userId: string,
    monday: string,
  ) => Promise<boolean> = () => Promise.resolve(false);

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

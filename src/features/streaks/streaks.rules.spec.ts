import { describe, expect, it } from 'vitest';
import {
  evaluateStreaks,
  summarizeStreaks,
  type ActivityDayInput,
  type EvaluateInput,
  type FreezeUse,
} from './streaks.rules.js';

const lesson = (day: string): ActivityDayInput => ({
  day,
  lessons: 1,
  checkIns: 0,
});
const checkIn = (day: string): ActivityDayInput => ({
  day,
  lessons: 0,
  checkIns: 1,
});

const run = (
  activity: ActivityDayInput[],
  today: string,
  extra: Partial<EvaluateInput> = {},
) =>
  evaluateStreaks({
    state: null,
    activity,
    usedFreezes: [],
    shieldedWeeks: new Set(),
    freezesPerMonth: 2,
    today,
    ...extra,
  });

describe('evaluateStreaks - flame (AC1, AC4)', () => {
  it('counts consecutive days and adds today once at read time', () => {
    const activity = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'];
    const result = run(
      [...activity.map(lesson), lesson('2026-10-30')],
      '2026-10-30',
    );
    expect(result.state.flameCount).toBe(4);
    expect(result.newFreezes).toEqual([]);
    const summary = summarizeStreaks({
      state: result.state,
      activity: [...activity.map(lesson), lesson('2026-10-30')],
      freezes: [],
      shieldedWeeks: new Set(),
      freezesPerMonth: 2,
      today: '2026-10-30',
    });
    expect(summary.flame).toEqual({ count: 5, doneToday: true, atRisk: false });
  });

  it('a missed day uses a freeze and keeps the run without adding', () => {
    const result = run(
      [lesson('2026-10-26'), lesson('2026-10-28')],
      '2026-10-29',
    );
    expect(result.state.flameCount).toBe(2);
    expect(result.newFreezes).toEqual([
      { kind: 'flame', date: '2026-10-27', month: '2026-10' },
    ]);
  });

  it('a missed day with the pool spent resets the flame to 0', () => {
    const used: FreezeUse[] = [
      { kind: 'flame', date: '2026-10-05', month: '2026-10' },
      { kind: 'boot', date: '2026-10-12', month: '2026-10' },
    ];
    const result = run([lesson('2026-10-26')], '2026-10-29', {
      usedFreezes: used,
    });
    expect(result.state.flameCount).toBe(0);
    expect(result.newFreezes).toEqual([]);
  });

  it('a new month starts a fresh pool', () => {
    const used: FreezeUse[] = [
      { kind: 'flame', date: '2026-10-05', month: '2026-10' },
      { kind: 'flame', date: '2026-10-06', month: '2026-10' },
    ];
    const result = run(
      [lesson('2026-10-31'), lesson('2026-11-02')],
      '2026-11-03',
      { usedFreezes: used },
    );
    expect(result.state.flameCount).toBe(2);
    expect(result.newFreezes).toEqual([
      { kind: 'flame', date: '2026-11-01', month: '2026-11' },
    ]);
  });
});

describe('evaluateStreaks - boot and the shared pool (AC2, AC4)', () => {
  it('counts consecutive Monday–Sunday weeks with a check-in', () => {
    const result = run(
      [checkIn('2026-10-07'), checkIn('2026-10-13'), checkIn('2026-10-25')],
      '2026-10-27',
    );
    expect(result.state.bootCount).toBe(3);
    expect(result.state.bootLastWeek).toBe('2026-10-19');
  });

  it('flame and boot draw on one monthly pool', () => {
    // Week of 12 Oct has no check-in (boot freeze); 20 and 21 Oct have no activity.
    const lessons = Array.from({ length: 8 }, (_, i) =>
      lesson(`2026-10-${String(12 + i)}`),
    );
    const result = run(
      [checkIn('2026-10-11'), ...lessons, checkIn('2026-10-22')],
      '2026-10-23',
    );
    expect(result.newFreezes).toEqual([
      { kind: 'boot', date: '2026-10-12', month: '2026-10' },
      { kind: 'flame', date: '2026-10-20', month: '2026-10' },
    ]);
    expect(result.state.flameCount).toBe(1);
    expect(result.state.bootCount).toBe(1);
  });

  it('a backdated check-in replayed from scratch fills the past day', () => {
    const before = run(
      [lesson('2026-10-26'), lesson('2026-10-28')],
      '2026-10-29',
    );
    expect(before.newFreezes).toHaveLength(1);
    const replay = run(
      [lesson('2026-10-26'), checkIn('2026-10-27'), lesson('2026-10-28')],
      '2026-10-29',
    );
    expect(replay.state.flameCount).toBe(3);
    expect(replay.newFreezes).toEqual([]);
    const again = evaluateStreaks({
      state: replay.state,
      activity: [],
      usedFreezes: [],
      shieldedWeeks: new Set(),
      freezesPerMonth: 2,
      today: '2026-10-29',
    });
    expect(again.changed).toBe(false);
  });
});

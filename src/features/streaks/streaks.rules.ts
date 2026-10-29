/**
 * Pure streak evaluation (features/streaks.md AC1, AC2, AC4). Dates are Asia/Tashkent calendar
 * dates as `YYYY-MM-DD`; weeks run Monday–Sunday.
 */

const DAY_MS = 86_400_000;
const SUNDAY = 0;

export type StreakKind = 'flame' | 'boot';
export type ActivityKind = 'lesson' | 'check_in';

export interface ActivityDayInput {
  day: string;
  lessons: number;
  checkIns: number;
}

export interface FreezeUse {
  kind: StreakKind;
  /** The missed day (flame) or the missed week's Monday (boot). */
  date: string;
  /** Tashkent `YYYY-MM` whose pool the freeze came from. */
  month: string;
}

/** Runs as of the end of `evaluatedThrough` (a day before today); today is added at read time. */
export interface StreakSnapshot {
  flameCount: number;
  flameLastDay: string | null;
  bootCount: number;
  bootLastWeek: string | null;
  evaluatedThrough: string | null;
}

export interface EvaluateInput {
  /** Null: evaluate from the first activity day. */
  state: StreakSnapshot | null;
  /** Every activity day from `activityFrom(state)` on (earlier days are ignored). */
  activity: readonly ActivityDayInput[];
  /** Freezes already used; they count against their month's pool. */
  usedFreezes: readonly FreezeUse[];
  /** Mondays of weather-shielded weeks. */
  shieldedWeeks: ReadonlySet<string>;
  freezesPerMonth: number;
  today: string;
}

export interface EvaluateResult {
  state: StreakSnapshot;
  newFreezes: FreezeUse[];
  /** False when nothing was walked (no write needed). */
  changed: boolean;
}

export interface StreaksSummary {
  today: string;
  flame: { count: number; doneToday: boolean; atRisk: boolean };
  boot: { count: number; doneThisWeek: boolean; shieldedLastWeek: boolean };
  freezes: {
    left: number;
    perMonth: number;
    usedThisMonth: { kind: StreakKind; date: string }[];
  };
}

const toDate = (day: string): Date => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date): string => date.toISOString().slice(0, 10);

export function addDays(day: string, days: number): string {
  return toDay(new Date(toDate(day).getTime() + days * DAY_MS));
}

export function mondayOf(day: string): string {
  const weekday = toDate(day).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export const monthOf = (day: string): string => day.slice(0, 7);

const isSunday = (day: string): boolean => toDate(day).getUTCDay() === SUNDAY;

/** First day the evaluator needs activity for: the Monday of the first unevaluated day's week. */
export function activityFrom(state: StreakSnapshot | null): string | null {
  return state?.evaluatedThrough
    ? mondayOf(addDays(state.evaluatedThrough, 1))
    : null;
}

/** Earliest activity day, or today when there is none. */
function firstDay(
  activity: readonly ActivityDayInput[],
  today: string,
): string {
  return activity.reduce((min, row) => (row.day < min ? row.day : min), today);
}

/** Mondays of finished weeks the evaluator will walk that had no check-in (shield candidates). */
export function missedWeeks(
  state: StreakSnapshot | null,
  activity: readonly ActivityDayInput[],
  today: string,
): string[] {
  const start = state?.evaluatedThrough
    ? addDays(state.evaluatedThrough, 1)
    : firstDay(activity, today);
  const checkInWeeks = new Set(
    activity.filter((row) => row.checkIns > 0).map((row) => mondayOf(row.day)),
  );
  const weeks: string[] = [];
  for (
    let monday = mondayOf(start);
    addDays(monday, 6) < today;
    monday = addDays(monday, 7)
  ) {
    if (addDays(monday, 6) >= start && !checkInWeeks.has(monday)) {
      weeks.push(monday);
    }
  }
  return weeks;
}

/**
 * Walks every day after `state.evaluatedThrough` up to yesterday. A missed day (flame) or a missed,
 * unshielded week (boot) uses a freeze from the month's shared pool, else that run resets to 0.
 * A run of 0 never uses a freeze. Re-running with the returned state walks nothing (idempotent).
 */
export function evaluateStreaks(input: EvaluateInput): EvaluateResult {
  const { state, today, freezesPerMonth, shieldedWeeks } = input;
  const yesterday = addDays(today, -1);
  const start = state?.evaluatedThrough
    ? addDays(state.evaluatedThrough, 1)
    : firstDay(input.activity, today);
  const next: StreakSnapshot = state
    ? { ...state }
    : {
        flameCount: 0,
        flameLastDay: null,
        bootCount: 0,
        bootLastWeek: null,
        evaluatedThrough: null,
      };
  if (start > yesterday) return { state: next, newFreezes: [], changed: false };

  const byDay = new Map(input.activity.map((row) => [row.day, row]));
  const used = new Map<string, number>();
  for (const freeze of input.usedFreezes) {
    used.set(freeze.month, (used.get(freeze.month) ?? 0) + 1);
  }
  const newFreezes: FreezeUse[] = [];
  const tryFreeze = (kind: StreakKind, date: string): boolean => {
    const month = monthOf(date);
    const count = used.get(month) ?? 0;
    if (count >= freezesPerMonth) return false;
    used.set(month, count + 1);
    newFreezes.push({ kind, date, month });
    return true;
  };

  for (let day = start; day <= yesterday; day = addDays(day, 1)) {
    const row = byDay.get(day);
    if (row && row.lessons + row.checkIns > 0) {
      next.flameCount += 1;
      next.flameLastDay = day;
    } else if (next.flameCount > 0 && !tryFreeze('flame', day)) {
      next.flameCount = 0;
    }

    if (isSunday(day)) {
      const monday = addDays(day, -6);
      if (weekHasCheckIn(byDay, monday)) {
        next.bootCount += 1;
      } else if (
        next.bootCount > 0 &&
        !shieldedWeeks.has(monday) &&
        !tryFreeze('boot', monday)
      ) {
        next.bootCount = 0;
      }
      next.bootLastWeek = monday;
    }
  }
  next.evaluatedThrough = yesterday;
  return { state: next, newFreezes, changed: true };
}

function weekHasCheckIn(
  byDay: ReadonlyMap<string, ActivityDayInput>,
  monday: string,
  through = addDays(monday, 6),
): boolean {
  for (let day = monday; day <= through; day = addDays(day, 1)) {
    if ((byDay.get(day)?.checkIns ?? 0) > 0) return true;
  }
  return false;
}

/** The read model: evaluated runs plus today / this week. */
export function summarizeStreaks(input: {
  state: StreakSnapshot;
  activity: readonly ActivityDayInput[];
  freezes: readonly FreezeUse[];
  shieldedWeeks: ReadonlySet<string>;
  freezesPerMonth: number;
  today: string;
}): StreaksSummary {
  const { state, today } = input;
  const byDay = new Map(input.activity.map((row) => [row.day, row]));
  const todayRow = byDay.get(today);
  const doneToday =
    todayRow !== undefined && todayRow.lessons + todayRow.checkIns > 0;
  const thisMonday = mondayOf(today);
  const lastMonday = addDays(thisMonday, -7);
  const doneThisWeek = weekHasCheckIn(byDay, thisMonday, today);
  const usedThisMonth = input.freezes
    .filter((freeze) => freeze.month === monthOf(today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ kind, date }) => ({ kind, date }));
  return {
    today,
    flame: {
      count: state.flameCount + (doneToday ? 1 : 0),
      doneToday,
      atRisk: !doneToday && state.flameCount > 0,
    },
    boot: {
      count: state.bootCount + (doneThisWeek ? 1 : 0),
      doneThisWeek,
      shieldedLastWeek:
        input.shieldedWeeks.has(lastMonday) &&
        !weekHasCheckIn(byDay, lastMonday),
    },
    freezes: {
      left: Math.max(0, input.freezesPerMonth - usedThisMonth.length),
      perMonth: input.freezesPerMonth,
      usedThisMonth,
    },
  };
}

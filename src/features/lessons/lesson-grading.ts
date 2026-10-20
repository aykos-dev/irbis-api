import { minusDays } from '../../lib/dates.js';
import { COMPLETED_AT_MAX_AGE_DAYS } from './lessons.constants.js';

export interface GradableQuestion {
  id: string;
  correctIndex: number;
}

export interface Attempt {
  questionId: string;
  optionIndex: number;
}

export type GradeFailure = 'notAllAnswered' | 'tooManyWrong';

export type GradeResult =
  | { ok: true; wrongCount: number; perfect: boolean }
  | { ok: false; reason: GradeFailure };

/**
 * Grades a lesson run against the current questions. Every question needs ≥ 1 correct attempt and
 * the wrong attempts must fit in the hearts (`heartsPerDay − 1`). An attempt for a question the lesson
 * no longer has (edited after the app cached it) skips the coverage check and is never perfect.
 */
export function gradeAttempts(
  questions: readonly GradableQuestion[],
  attempts: readonly Attempt[],
  heartsPerDay: number,
): GradeResult {
  const correctIndexById = new Map(
    questions.map((q) => [q.id, q.correctIndex]),
  );
  const answered = new Set<string>();
  let wrongCount = 0;
  let stale = false;
  for (const attempt of attempts) {
    const correctIndex = correctIndexById.get(attempt.questionId);
    if (correctIndex === undefined) {
      stale = true;
    } else if (attempt.optionIndex === correctIndex) {
      answered.add(attempt.questionId);
    } else {
      wrongCount += 1;
    }
  }
  if (!stale && answered.size < questions.length) {
    return { ok: false, reason: 'notAllAnswered' };
  }
  if (wrongCount > heartsPerDay - 1) {
    return { ok: false, reason: 'tooManyWrong' };
  }
  return { ok: true, wrongCount, perfect: !stale && wrongCount === 0 };
}

/** The reported finish time, or `now` when it is in the future or older than 7 days. */
export function effectiveCompletedAt(reported: Date, now: Date): Date {
  const tooOld = reported < minusDays(now, COMPLETED_AT_MAX_AGE_DAYS);
  const inFuture = reported > now;
  return tooOld || inFuture || Number.isNaN(reported.getTime())
    ? now
    : reported;
}

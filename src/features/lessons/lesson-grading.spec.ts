import { effectiveCompletedAt, gradeAttempts } from './lesson-grading.js';

const QUESTIONS = [
  { id: 'q1', correctIndex: 0 },
  { id: 'q2', correctIndex: 1 },
];
const HEARTS = 5;

describe('gradeAttempts', () => {
  it('every question right first time is perfect; wrong answers count but still pass within hearts', () => {
    expect(
      gradeAttempts(
        QUESTIONS,
        [
          { questionId: 'q1', optionIndex: 0 },
          { questionId: 'q2', optionIndex: 1 },
        ],
        HEARTS,
      ),
    ).toEqual({ ok: true, wrongCount: 0, perfect: true });
    expect(
      gradeAttempts(
        QUESTIONS,
        [
          { questionId: 'q1', optionIndex: 2 },
          { questionId: 'q1', optionIndex: 0 },
          { questionId: 'q2', optionIndex: 1 },
        ],
        HEARTS,
      ),
    ).toEqual({ ok: true, wrongCount: 1, perfect: false });
  });

  it('rejects a missing correct answer and wrongs beyond heartsPerDay − 1', () => {
    expect(
      gradeAttempts(QUESTIONS, [{ questionId: 'q1', optionIndex: 0 }], HEARTS),
    ).toEqual({ ok: false, reason: 'notAllAnswered' });
    const fiveWrong = Array.from({ length: 5 }, () => ({
      questionId: 'q1',
      optionIndex: 3,
    }));
    expect(
      gradeAttempts(
        QUESTIONS,
        [
          ...fiveWrong,
          { questionId: 'q1', optionIndex: 0 },
          { questionId: 'q2', optionIndex: 1 },
        ],
        HEARTS,
      ),
    ).toEqual({ ok: false, reason: 'tooManyWrong' });
  });

  it('an attempt for a question the lesson no longer has skips coverage and is never perfect', () => {
    expect(
      gradeAttempts(
        QUESTIONS,
        [{ questionId: 'gone', optionIndex: 0 }],
        HEARTS,
      ),
    ).toEqual({ ok: true, wrongCount: 0, perfect: false });
  });
});

describe('effectiveCompletedAt', () => {
  const now = new Date('2026-10-20T10:00:00Z');

  it('keeps a time within the last 7 days; future or older than 7 days becomes now', () => {
    const recent = new Date('2026-10-15T10:00:00Z');
    expect(effectiveCompletedAt(recent, now)).toBe(recent);
    expect(effectiveCompletedAt(new Date('2026-10-20T10:00:01Z'), now)).toBe(
      now,
    );
    expect(effectiveCompletedAt(new Date('2026-10-13T09:59:59Z'), now)).toBe(
      now,
    );
  });
});

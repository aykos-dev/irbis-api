import {
  correctPosition,
  isUzbekLatin,
  toLessonSeedRows,
  type LessonSource,
  type QuestionSource,
} from './lesson-seed.rules.js';
import { lessonSources } from './lessons.data.js';

describe('lesson seed rules (AC8)', () => {
  const rows = toLessonSeedRows(lessonSources);

  it('seeds 18 publishable lessons, 3 per tier, 10 four-option questions each, about half with hints', () => {
    expect(rows).toHaveLength(18);
    const perTier = new Map<string, number[]>();
    for (const row of rows) {
      perTier.set(row.tierKey, [
        ...(perTier.get(row.tierKey) ?? []),
        row.order,
      ]);
      expect(row.questions).toHaveLength(10);
      expect(
        new Set(row.questions.map((q) => q.correctIndex)).size,
      ).toBeGreaterThanOrEqual(3);
    }
    expect(Object.fromEntries(perTier)).toEqual({
      '1': [1, 2, 3],
      '2': [1, 2, 3],
      '3': [1, 2, 3],
      '4': [1, 2, 3],
      'first-aid': [1, 2, 3],
      '5': [1, 2, 3],
    });
    const questions = rows.flatMap((r) => r.questions);
    const hinted = questions.filter((q) => q.hint !== null).length;
    expect(hinted / questions.length).toBeGreaterThanOrEqual(0.4);
    expect(hinted / questions.length).toBeLessThanOrEqual(0.6);
  });

  it('places the correct answer at a varying position and keeps the canvas altitude question verbatim', () => {
    expect([0, 1, 2, 3].map((i) => correctPosition(0, i))).toEqual([
      0, 3, 2, 1,
    ]);
    const altitude = rows.find((r) => r.title.en === 'Altitude & health');
    const canvas = altitude?.questions.find(
      (q) =>
        q.prompt.en ===
        'What should you do if you notice signs of altitude sickness?',
    );
    expect(canvas?.hint?.en).toBe(
      'Headache, nausea, dizziness… think safety first!',
    );
    expect(canvas?.explanation.en).toBe(
      "Stop climbing and rest. If symptoms don't improve within a few hours — or get worse — descend at least 300–500 m. Never go higher with symptoms.",
    );
    expect(canvas?.wrongExplanation.en).toBe(
      'Stop ascending and rest; descend if symptoms persist. Rushing higher makes altitude sickness worse.',
    );
    expect(canvas?.options[canvas.correctIndex]?.en).toMatch(
      /^Stop climbing and rest/,
    );
  });

  it('rejects a lesson with a blank locale, an over-long option or non-Latin Uzbek', () => {
    const base: LessonSource = lessonSources[0];
    const first: QuestionSource = base.questions[0];
    const withQuestion = (q: QuestionSource): LessonSource[] => [
      { ...base, questions: [q, ...base.questions.slice(1)] },
    ];
    expect(() =>
      toLessonSeedRows(withQuestion({ ...first, prompt: ['', 'ру', 'en'] })),
    ).toThrow(/questions\.0\.prompt\.uz/);
    expect(() =>
      toLessonSeedRows(
        withQuestion({ ...first, answer: ['a', 'б', 'x'.repeat(121)] }),
      ),
    ).toThrow(/> 120/);
    expect(isUzbekLatin("To'g'ri")).toBe(false);
    expect(isUzbekLatin('Toʻgʻri, taʼsir')).toBe(true);
  });
});

import { publishErrors } from '../../src/features/lessons-admin/lesson.rules.js';
import {
  LESSON_ICONS,
  LESSON_TEXT_MAX,
  LOCALES,
  OPTION_TEXT_MAX,
  type L10n,
  type LessonIcon,
} from '../../src/features/lessons-admin/lessons-admin.constants.js';

/** `[uz, ru, en]` text as written in lessons.data.ts. */
export type Text = readonly [uz: string, ru: string, en: string];

/** One question of lessons.data.ts: the correct answer is written first; the seed places it. */
export interface QuestionSource {
  prompt: Text;
  hint?: Text;
  answer: Text;
  wrong: readonly [Text, Text, Text];
  explanation: Text;
  wrongExplanation: Text;
}

export interface LessonSource {
  tierKey: string;
  icon: LessonIcon;
  title: Text;
  questions: readonly QuestionSource[];
}

export interface QuestionSeedRow {
  order: number;
  prompt: L10n;
  hint: L10n | null;
  options: L10n[];
  correctIndex: number;
  explanation: L10n;
  wrongExplanation: L10n;
}

export interface LessonSeedRow {
  tierKey: string;
  order: number;
  icon: LessonIcon;
  title: L10n;
  questions: QuestionSeedRow[];
}

export const SEED_QUESTIONS_PER_LESSON = 10;

const toL10n = ([uz, ru, en]: Text): L10n => ({ uz, ru, en });

/** Where the correct option goes: varies inside a lesson and between lessons. */
export function correctPosition(
  lessonIndex: number,
  questionIndex: number,
): number {
  return (lessonIndex + questionIndex * 3) % 4;
}

function toQuestionRow(
  source: QuestionSource,
  lessonIndex: number,
  questionIndex: number,
): QuestionSeedRow {
  const correctIndex = correctPosition(lessonIndex, questionIndex);
  const options = source.wrong.map(toL10n);
  options.splice(correctIndex, 0, toL10n(source.answer));
  return {
    order: questionIndex + 1,
    prompt: toL10n(source.prompt),
    hint: source.hint ? toL10n(source.hint) : null,
    options,
    correctIndex,
    explanation: toL10n(source.explanation),
    wrongExplanation: toL10n(source.wrongExplanation),
  };
}

const questionTexts = (q: QuestionSeedRow): L10n[] =>
  [q.prompt, q.hint, ...q.options, q.explanation, q.wrongExplanation].filter(
    (text): text is L10n => text !== null,
  );

/** Uzbek Latin: no Cyrillic, and oʻ/gʻ and the tutuq belgisi use ʻ / ʼ, never ' ‘ ’ or `. */
export function isUzbekLatin(text: string): boolean {
  return !/[\u0400-\u04FF'‘’`]/.test(text);
}

/** Every rule a seeded lesson must meet; empty when it would pass the publish rules (AC3). */
export function lessonSeedErrors(row: LessonSeedRow): string[] {
  const errors: string[] = [];
  if (!(LESSON_ICONS as readonly string[]).includes(row.icon)) {
    errors.push(`icon "${row.icon}"`);
  }
  if (row.questions.length !== SEED_QUESTIONS_PER_LESSON) {
    errors.push(`questions: ${row.questions.length}`);
  }
  const content = {
    title: row.title,
    questions: row.questions.map((q) => ({ ...q, imageKey: null })),
  };
  for (const path of Object.keys(publishErrors(content))) errors.push(path);

  const tooLong = (text: L10n | null, max: number, path: string): void => {
    if (text === null) return;
    for (const locale of LOCALES) {
      if (text[locale].length > max) errors.push(`${path}.${locale} > ${max}`);
    }
  };
  tooLong(row.title, LESSON_TEXT_MAX, 'title');
  row.questions.forEach((q, i) => {
    const base = `questions.${i}`;
    tooLong(q.prompt, LESSON_TEXT_MAX, `${base}.prompt`);
    tooLong(q.hint, LESSON_TEXT_MAX, `${base}.hint`);
    tooLong(q.explanation, LESSON_TEXT_MAX, `${base}.explanation`);
    tooLong(q.wrongExplanation, LESSON_TEXT_MAX, `${base}.wrongExplanation`);
    q.options.forEach((o, j) =>
      tooLong(o, OPTION_TEXT_MAX, `${base}.options.${j}`),
    );
    if (q.options.length !== 4)
      errors.push(`${base}.options: ${q.options.length}`);
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      errors.push(`${base}.correctIndex`);
    }
  });
  for (const text of [row.title, ...row.questions.flatMap(questionTexts)]) {
    if (!isUzbekLatin(text.uz)) errors.push(`uz script: "${text.uz}"`);
  }
  return errors;
}

/** All rows, ordered 1..n inside each tier; throws when any lesson would fail the publish rules. */
export function toLessonSeedRows(
  sources: readonly LessonSource[],
): LessonSeedRow[] {
  const perTier = new Map<string, number>();
  return sources.map((source, lessonIndex) => {
    const order = (perTier.get(source.tierKey) ?? 0) + 1;
    perTier.set(source.tierKey, order);
    const row: LessonSeedRow = {
      tierKey: source.tierKey,
      order,
      icon: source.icon,
      title: toL10n(source.title),
      questions: source.questions.map((q, i) =>
        toQuestionRow(q, lessonIndex, i),
      ),
    };
    const errors = lessonSeedErrors(row);
    if (errors.length > 0) {
      throw new Error(
        `Lesson "${row.title.en}" is invalid: ${errors.join(', ')}`,
      );
    }
    return row;
  });
}

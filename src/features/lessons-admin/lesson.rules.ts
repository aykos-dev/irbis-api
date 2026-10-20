import type { FieldErrors } from '../../common/errors/validation.error.js';
import {
  LOCALES,
  PUBLISH_QUESTIONS_MIN,
  QUESTIONS_MAX,
  type L10n,
} from './lessons-admin.constants.js';

export interface QuestionContent {
  prompt: L10n;
  hint: L10n | null;
  options: L10n[];
  correctIndex: number;
  explanation: L10n;
  wrongExplanation: L10n | null;
  imageKey: string | null;
}

export interface LessonContent {
  title: L10n;
  questions: QuestionContent[];
}

const isBlank = (text: string): boolean => text.trim() === '';

/** True when every locale is blank: such an optional text counts as not set. */
export const isEmptyText = (text: L10n): boolean =>
  LOCALES.every((locale) => isBlank(text[locale]));

/** An optional text with every locale blank is stored as null. */
export const optionalText = (text: L10n | null | undefined): L10n | null =>
  text == null || isEmptyText(text) ? null : text;

/** Structure checks the DTO cannot express: `correctIndex` must point at an option. */
export function structureErrors(questions: QuestionContent[]): FieldErrors {
  const errors: FieldErrors = {};
  questions.forEach((q, i) => {
    if (q.correctIndex >= q.options.length) {
      errors[`questions.${i}.correctIndex`] = ['outOfRange'];
    }
  });
  return errors;
}

/** Every path that blocks publishing; empty when the lesson can be published. */
export function publishErrors(lesson: LessonContent): FieldErrors {
  const errors: FieldErrors = {};
  const required = (text: L10n, path: string): void => {
    for (const locale of LOCALES) {
      if (isBlank(text[locale])) errors[`${path}.${locale}`] = ['blank'];
    }
  };
  const optional = (text: L10n | null, path: string): void => {
    if (text !== null && !isEmptyText(text)) required(text, path);
  };

  required(lesson.title, 'title');
  const count = lesson.questions.length;
  if (count < PUBLISH_QUESTIONS_MIN || count > QUESTIONS_MAX) {
    errors.questions = ['count'];
  }
  lesson.questions.forEach((q, i) => {
    const base = `questions.${i}`;
    required(q.prompt, `${base}.prompt`);
    optional(q.hint, `${base}.hint`);
    q.options.forEach((option, j) => required(option, `${base}.options.${j}`));
    required(q.explanation, `${base}.explanation`);
    optional(q.wrongExplanation, `${base}.wrongExplanation`);
  });
  return errors;
}

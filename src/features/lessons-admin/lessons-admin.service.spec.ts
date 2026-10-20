import { RequestValidationError } from '../../common/errors/validation.error.js';
import { publishErrors, type QuestionContent } from './lesson.rules.js';
import type { L10n } from './lessons-admin.constants.js';
import {
  LessonNotPublishableError,
  TierNotEmptyError,
} from './lessons-admin.errors.js';
import type {
  LessonRecord,
  LessonsAdminRepository,
  TierRecord,
} from './lessons-admin.repository.js';
import { LessonsAdminService } from './lessons-admin.service.js';

const full = (word: string): L10n => ({
  uz: `${word}_uz`,
  ru: `${word}_ru`,
  en: `${word}_en`,
});
const question = (over: Partial<QuestionContent> = {}): QuestionContent => ({
  prompt: full('prompt'),
  hint: null,
  options: [full('a'), full('b')],
  correctIndex: 0,
  explanation: full('why'),
  wrongExplanation: null,
  imageKey: null,
  ...over,
});
const FIRST_PUBLISH = new Date('2026-10-01T00:00:00Z');

function lesson(over: Partial<LessonRecord> = {}): LessonRecord {
  return {
    id: 'lesson_1',
    tierId: 'tier_1',
    title: full('title'),
    icon: 'compass',
    order: 1,
    status: 'draft',
    questionCount: 5,
    publishedAt: null,
    updatedAt: FIRST_PUBLISH,
    questions: Array.from({ length: 5 }, (_, i) => ({
      ...question(),
      id: `q_${i}`,
      order: i + 1,
    })),
    ...over,
  };
}

function setup(stored: LessonRecord, tier?: Partial<TierRecord>) {
  const repo = {
    findLesson: vi.fn().mockResolvedValue(stored),
    replaceLesson: vi.fn().mockResolvedValue(undefined),
    setStatus: vi.fn().mockResolvedValue(undefined),
    tierIds: vi.fn().mockResolvedValue(['tier_1', 'tier_2']),
    reorderTiers: vi.fn(),
    findTier: vi
      .fn()
      .mockResolvedValue({ id: 'tier_1', lessonCount: 0, ...tier }),
    deleteTier: vi.fn(),
  };
  const service = new LessonsAdminService(
    repo as unknown as LessonsAdminRepository,
  );
  return { repo, service };
}

describe('publishErrors (AC3)', () => {
  it('lists every blank required locale, a half-filled hint and the question count', () => {
    const errors = publishErrors({
      title: { uz: 'ok', ru: ' ', en: 'ok' },
      questions: [
        question({
          options: [full('a'), { uz: 'b', ru: '', en: 'b' }],
          hint: { uz: 'h', ru: '', en: '' },
        }),
      ],
    });
    expect(errors).toEqual({
      'title.ru': ['blank'],
      questions: ['count'],
      'questions.0.options.1.ru': ['blank'],
      'questions.0.hint.ru': ['blank'],
      'questions.0.hint.en': ['blank'],
    });
  });

  it('passes a complete lesson with 5 questions and no hints', () => {
    expect(publishErrors(lesson())).toEqual({});
  });
});

describe('LessonsAdminService', () => {
  it('publish keeps the first publishedAt', async () => {
    const { repo, service } = setup(
      lesson({ status: 'draft', publishedAt: FIRST_PUBLISH }),
    );
    await service.publish('lesson_1', new Date('2026-10-20T00:00:00Z'));
    expect(repo.setStatus).toHaveBeenCalledWith(
      'lesson_1',
      'published',
      FIRST_PUBLISH,
    );
  });

  it('PUT on a published lesson that breaks publish rules → 422 and nothing saved', async () => {
    const { repo, service } = setup(
      lesson({ status: 'published', publishedAt: FIRST_PUBLISH }),
    );
    const err = await service
      .replaceLesson('lesson_1', {
        title: full('title'),
        icon: 'compass',
        questions: [question()],
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LessonNotPublishableError);
    expect((err as LessonNotPublishableError).fieldErrors).toEqual({
      questions: ['count'],
    });
    expect(repo.replaceLesson).not.toHaveBeenCalled();
  });

  it('PUT draft: correctIndex past the options → VALIDATION_FAILED; all-blank hint saved as null', async () => {
    const { repo, service } = setup(lesson());
    const err = await service
      .replaceLesson('lesson_1', {
        title: full('title'),
        icon: 'compass',
        questions: [question(), question({ correctIndex: 2 })],
      })
      .catch((e: unknown) => e);
    expect((err as RequestValidationError).fieldErrors).toEqual({
      'questions.1.correctIndex': ['outOfRange'],
    });

    await service.replaceLesson('lesson_1', {
      title: { uz: '', ru: '', en: '' },
      icon: 'leaf',
      questions: [question({ hint: { uz: ' ', ru: '', en: '' } })],
    });
    const saved = repo.replaceLesson.mock.calls[0][1] as {
      questions: QuestionContent[];
    };
    expect(saved.questions[0].hint).toBeNull();
  });

  it('reorderTiers rejects ids that are not exactly every tier', async () => {
    const { repo, service } = setup(lesson());
    await expect(
      service.reorderTiers(['tier_1', 'tier_1']),
    ).rejects.toBeInstanceOf(RequestValidationError);
    expect(repo.reorderTiers).not.toHaveBeenCalled();
  });

  it('deleteTier with lessons → TIER_NOT_EMPTY', async () => {
    const { repo, service } = setup(lesson(), { lessonCount: 1 });
    await expect(service.deleteTier('tier_1')).rejects.toBeInstanceOf(
      TierNotEmptyError,
    );
    expect(repo.deleteTier).not.toHaveBeenCalled();
  });
});

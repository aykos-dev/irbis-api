import type { StorageService } from '../../lib/storage/storage.service.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import type { AwardResult, LevelsService } from '../levels/levels.service.js';
import { LessonNotFoundError } from './lessons.errors.js';
import type {
  LessonsRepository,
  NewCompletion,
  PublishedLessonRecord,
} from './lessons.repository.js';
import { LessonsService } from './lessons.service.js';

const NOW = new Date('2026-10-20T10:00:00Z');
const CONFIG = { heartsPerDay: 5, xpFirst: 10, xpPerfect: 15, dailyGoal: 3 };
const text = { uz: 't_uz', ru: 't_ru', en: 't_en' };
const LESSON: PublishedLessonRecord = {
  id: 'lesson_1',
  tierKey: '1',
  title: text,
  icon: 'compass',
  updatedAt: NOW,
  questions: [
    {
      id: 'q1',
      order: 1,
      prompt: text,
      hint: null,
      options: [text, text],
      correctIndex: 0,
      explanation: text,
      wrongExplanation: null,
      imageKey: null,
    },
  ],
};

function setup(opts: { completed?: boolean; inserted?: boolean } = {}) {
  const inserts: NewCompletion[] = [];
  const awards: number[] = [];
  const repository = {
    findPublishedLesson: (id: string) =>
      Promise.resolve(id === LESSON.id ? LESSON : null),
    hasCompletion: () => Promise.resolve(opts.completed ?? false),
    insertCompletion: (data: NewCompletion) => {
      inserts.push(data);
      return Promise.resolve(opts.inserted ?? true);
    },
    countCompletionsSince: () => Promise.resolve(1),
  } as unknown as LessonsRepository;
  const levels = {
    award: ({ amount }: { amount: number }): Promise<AwardResult> => {
      awards.push(amount);
      return Promise.resolve({
        entry: { amount } as AwardResult['entry'],
        created: true,
        capped: false,
        levelUps: [],
      });
    },
    recordFact: () => Promise.resolve({ created: true, levelUps: [] }),
  } as unknown as LevelsService;
  const config = {
    lessonsConfig: () => Promise.resolve(CONFIG),
  } as unknown as GameConfigService;
  const service = new LessonsService(
    repository,
    config,
    levels,
    {} as StorageService,
  );
  return { service, inserts, awards };
}

const input = (optionIndexes: number[], completedAt = NOW.toISOString()) => ({
  lessonId: LESSON.id,
  completedAt,
  attempts: optionIndexes.map((optionIndex) => ({
    questionId: 'q1',
    optionIndex,
  })),
});

describe('LessonsService.complete', () => {
  it('first perfect run awards xpPerfect and stores the completion; one wrong awards xpFirst', async () => {
    const perfect = setup();
    const res = await perfect.service.complete('user_1', input([0]), NOW);
    expect(res).toEqual({
      firstCompletion: true,
      perfect: true,
      xpAwarded: 15,
      doneToday: 1,
      dailyGoal: 3,
      levelUps: [],
    });
    expect(perfect.inserts[0]).toMatchObject({
      xp: 15,
      wrongCount: 0,
      perfect: true,
    });

    const oneWrong = setup();
    const res2 = await oneWrong.service.complete('user_1', input([1, 0]), NOW);
    expect(res2).toMatchObject({
      firstCompletion: true,
      perfect: false,
      xpAwarded: 10,
    });
  });

  it('a repeat or a lost insert race awards nothing and writes nothing new', async () => {
    const repeat = setup({ completed: true });
    const res = await repeat.service.complete('user_1', input([0]), NOW);
    expect(res).toMatchObject({ firstCompletion: false, xpAwarded: 0 });
    expect(repeat.awards).toEqual([]);
    expect(repeat.inserts).toEqual([]);

    const raced = setup({ inserted: false });
    expect(
      await raced.service.complete('user_1', input([0]), NOW),
    ).toMatchObject({
      firstCompletion: false,
      xpAwarded: 0,
    });
  });

  it('unknown lesson → LESSON_NOT_FOUND; a stale completedAt is stored as now', async () => {
    const { service, inserts } = setup();
    await expect(
      service.complete('user_1', { ...input([0]), lessonId: 'other' }, NOW),
    ).rejects.toBeInstanceOf(LessonNotFoundError);
    await service.complete('user_1', input([0], '2026-01-01T00:00:00Z'), NOW);
    expect(inserts[0].completedAt).toBe(NOW);
  });
});

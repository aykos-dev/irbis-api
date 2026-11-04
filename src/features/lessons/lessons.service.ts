import { Injectable, Optional } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { startOfTashkentDay } from '../../lib/dates.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { LevelsService } from '../levels/levels.service.js';
import { StreaksService } from '../streaks/streaks.service.js';
import { effectiveCompletedAt, gradeAttempts } from './lesson-grading.js';
import { attemptsRejected, LessonNotFoundError } from './lessons.errors.js';
import { LessonsRepository } from './lessons.repository.js';
import type { CompletionInputDto } from './dto/lessons.request.dto.js';
import type {
  CompletionResultDto,
  LessonCatalogDto,
  PublicLessonDto,
} from './dto/lessons.response.dto.js';

/** Public lesson catalog and completions; XP and level facts go through LevelsService. */
@Injectable()
export class LessonsService {
  constructor(
    private readonly repository: LessonsRepository,
    private readonly gameConfig: GameConfigService,
    private readonly levels: LevelsService,
    private readonly storage: StorageService,
    @Optional() private readonly streaks?: StreaksService,
  ) {}

  async catalog(
    userId: string | undefined,
    now = new Date(),
  ): Promise<LessonCatalogDto> {
    const [config, tiers] = await Promise.all([
      this.gameConfig.lessonsConfig(),
      this.repository.catalog(),
    ]);
    const progress =
      userId === undefined
        ? null
        : {
            completedLessonIds:
              await this.repository.completedLessonIds(userId),
            doneToday: await this.repository.countCompletionsSince(
              userId,
              startOfTashkentDay(now),
            ),
          };
    return {
      config,
      tiers: tiers.filter((tier) => tier.lessons.length > 0),
      progress,
    };
  }

  async getLesson(id: string): Promise<PublicLessonDto> {
    const lesson = isUUID(id)
      ? await this.repository.findPublishedLesson(id)
      : null;
    if (!lesson) throw new LessonNotFoundError();
    return {
      ...lesson,
      questions: lesson.questions.map(({ imageKey, ...q }) => ({
        ...q,
        image:
          imageKey === null ? null : { url: this.storage.publicUrl(imageKey) },
      })),
    };
  }

  /**
   * Grades a lesson run; the first valid completion awards XP (15 perfect / 10 otherwise, from config)
   * and records the level fact. Award and fact are idempotent per lesson, so they run before the
   * completion row: a retry after a partial failure finishes the job without double XP.
   */
  async complete(
    userId: string,
    input: CompletionInputDto,
    now = new Date(),
  ): Promise<CompletionResultDto> {
    const config = await this.gameConfig.lessonsConfig();
    const lesson = await this.repository.findPublishedLesson(input.lessonId);
    if (!lesson) throw new LessonNotFoundError();

    const grade = gradeAttempts(
      lesson.questions,
      input.attempts,
      config.heartsPerDay,
    );
    if (!grade.ok) throw attemptsRejected(grade.reason);
    const completedAt = effectiveCompletedAt(new Date(input.completedAt), now);

    const result = async (
      firstCompletion: boolean,
      xpAwarded: number,
      levelUps: CompletionResultDto['levelUps'],
    ): Promise<CompletionResultDto> => {
      // First and practice completions (guest merges included) count on their own Tashkent day.
      await this.streaks?.recordActivity(userId, 'lesson', completedAt, now);
      return {
        firstCompletion,
        perfect: grade.perfect,
        xpAwarded,
        doneToday: await this.repository.countCompletionsSince(
          userId,
          startOfTashkentDay(now),
        ),
        dailyGoal: config.dailyGoal,
        levelUps,
      };
    };

    if (await this.repository.hasCompletion(userId, lesson.id)) {
      return result(false, 0, []);
    }

    const award = await this.levels.award(
      {
        userId,
        source: 'lesson',
        refId: lesson.id,
        amount: grade.perfect ? config.xpPerfect : config.xpFirst,
      },
      now,
    );
    const fact = await this.levels.recordFact(
      { userId, kind: 'lesson', refId: lesson.id, tier: lesson.tierKey },
      now,
    );
    const xp = award.entry?.amount ?? 0;
    const inserted = await this.repository.insertCompletion({
      userId,
      lessonId: lesson.id,
      completedAt,
      wrongCount: grade.wrongCount,
      perfect: grade.perfect,
      xp,
    });
    if (!inserted) return result(false, 0, []);

    const levelUps = [...award.levelUps, ...fact.levelUps].map(
      ({ id, fromLevel, toLevel }) => ({ id, fromLevel, toLevel }),
    );
    return result(true, xp, levelUps);
  }
}

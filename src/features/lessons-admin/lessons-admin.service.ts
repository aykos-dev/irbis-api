import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import {
  optionalText,
  publishErrors,
  structureErrors,
  type QuestionContent,
} from './lesson.rules.js';
import type { L10n, LessonIcon } from './lessons-admin.constants.js';
import {
  LessonNotFoundError,
  LessonNotPublishableError,
  LessonPublishedError,
  TierNotEmptyError,
  TierNotFoundError,
} from './lessons-admin.errors.js';
import {
  LessonsAdminRepository,
  type LessonRecord,
  type LessonSummaryRecord,
  type TierRecord,
} from './lessons-admin.repository.js';

export interface LessonInput {
  title: L10n;
  icon: LessonIcon;
  questions: QuestionContent[];
}

const sameSet = (ids: string[], expected: string[]): boolean => {
  const given = new Set(ids);
  return (
    given.size === ids.length &&
    ids.length === expected.length &&
    expected.every((id) => given.has(id))
  );
};

const hasErrors = (errors: object): boolean => Object.keys(errors).length > 0;

/** Admin lesson content: tiers, lessons, questions and the publish rules. */
@Injectable()
export class LessonsAdminService {
  constructor(private readonly repo: LessonsAdminRepository) {}

  // --- tiers ---

  listTiers(): Promise<TierRecord[]> {
    return this.repo.listTiers();
  }

  async createTier(data: {
    key: string;
    title: L10n;
    colour: string;
  }): Promise<TierRecord> {
    const id = await this.repo.createTier(data);
    return this.requireTier(id);
  }

  async updateTier(
    id: string,
    data: { title?: L10n; colour?: string },
  ): Promise<TierRecord> {
    if (!(await this.repo.updateTier(id, data))) throw new TierNotFoundError();
    return this.requireTier(id);
  }

  /** `ids` must be exactly every tier id; orders become 1..n. */
  async reorderTiers(ids: string[]): Promise<TierRecord[]> {
    if (!sameSet(ids, await this.repo.tierIds())) {
      throw new RequestValidationError({ ids: ['notAllTiers'] });
    }
    await this.repo.reorderTiers(ids);
    return this.repo.listTiers();
  }

  async deleteTier(id: string): Promise<void> {
    const tier = await this.requireTier(id);
    if (tier.lessonCount > 0) throw new TierNotEmptyError();
    await this.repo.deleteTier(id);
  }

  // --- lessons ---

  async listLessons(tierId: string): Promise<LessonSummaryRecord[]> {
    await this.requireTierExists(tierId);
    return this.repo.listLessons(tierId);
  }

  /** `ids` must be exactly the tier's lesson ids; orders become 1..n. */
  async reorderLessons(
    tierId: string,
    ids: string[],
  ): Promise<LessonSummaryRecord[]> {
    await this.requireTierExists(tierId);
    if (!sameSet(ids, await this.repo.lessonIds(tierId))) {
      throw new RequestValidationError({ ids: ['notAllTierLessons'] });
    }
    await this.repo.reorderLessons(ids);
    return this.repo.listLessons(tierId);
  }

  async createLesson(data: {
    tierId: string;
    title: L10n;
    icon: LessonIcon;
  }): Promise<LessonRecord> {
    await this.requireTierExists(data.tierId);
    const id = await this.repo.createLesson(data);
    return this.getLesson(id);
  }

  async getLesson(id: string): Promise<LessonRecord> {
    const lesson = await this.repo.findLesson(id);
    if (!lesson) throw new LessonNotFoundError();
    return lesson;
  }

  /** Whole-lesson replace. A published lesson must stay publishable, else 422 and nothing is saved. */
  async replaceLesson(id: string, input: LessonInput): Promise<LessonRecord> {
    const lesson = await this.getLesson(id);
    const questions = input.questions.map((q) => ({
      ...q,
      hint: optionalText(q.hint),
      wrongExplanation: optionalText(q.wrongExplanation),
    }));
    const structure = structureErrors(questions);
    if (hasErrors(structure)) throw new RequestValidationError(structure);
    if (lesson.status === 'published') {
      const problems = publishErrors({ title: input.title, questions });
      if (hasErrors(problems)) throw new LessonNotPublishableError(problems);
    }
    await this.repo.replaceLesson(id, { ...input, questions });
    return this.getLesson(id);
  }

  /** Publishes when every rule passes; `publishedAt` keeps the first publish time. */
  async publish(id: string, now: Date = new Date()): Promise<LessonRecord> {
    const lesson = await this.getLesson(id);
    const problems = publishErrors(lesson);
    if (hasErrors(problems)) throw new LessonNotPublishableError(problems);
    await this.repo.setStatus(id, 'published', lesson.publishedAt ?? now);
    return this.getLesson(id);
  }

  async unpublish(id: string): Promise<LessonRecord> {
    const lesson = await this.getLesson(id);
    await this.repo.setStatus(id, 'draft', lesson.publishedAt);
    return this.getLesson(id);
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.getLesson(id);
    if (lesson.status === 'published') throw new LessonPublishedError();
    await this.repo.deleteLesson(id);
  }

  private async requireTier(id: string): Promise<TierRecord> {
    const tier = await this.repo.findTier(id);
    if (!tier) throw new TierNotFoundError();
    return tier;
  }

  private async requireTierExists(id: string): Promise<void> {
    if (!(await this.repo.tierExists(id))) throw new TierNotFoundError();
  }
}

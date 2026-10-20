import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  L10n,
  LessonIcon,
} from '../lessons-admin/lessons-admin.constants.js';

export interface CatalogLessonRecord {
  id: string;
  title: L10n;
  icon: LessonIcon;
  order: number;
  questionCount: number;
  updatedAt: Date;
}

export interface CatalogTierRecord {
  key: string;
  title: L10n;
  colour: string;
  order: number;
  lessons: CatalogLessonRecord[];
}

export interface PublicQuestionRecord {
  id: string;
  order: number;
  prompt: L10n;
  hint: L10n | null;
  options: L10n[];
  correctIndex: number;
  explanation: L10n;
  wrongExplanation: L10n | null;
  imageKey: string | null;
}

export interface PublishedLessonRecord {
  id: string;
  tierKey: string;
  title: L10n;
  icon: LessonIcon;
  updatedAt: Date;
  questions: PublicQuestionRecord[];
}

export interface NewCompletion {
  userId: string;
  lessonId: string;
  completedAt: Date;
  wrongCount: number;
  perfect: boolean;
  xp: number;
}

const text = (value: Prisma.JsonValue): L10n => value as unknown as L10n;
const optionalText = (value: Prisma.JsonValue | null): L10n | null =>
  value === null ? null : text(value);

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/** Public reads of published lessons and the per-user completion rows. */
@Injectable()
export class LessonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every tier by order with its published lessons by order (tiers may come back empty). */
  async catalog(): Promise<CatalogTierRecord[]> {
    const tiers = await this.prisma.lessonTier.findMany({
      orderBy: { order: 'asc' },
      select: {
        key: true,
        title: true,
        colour: true,
        order: true,
        lessons: {
          where: { status: 'published' },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            icon: true,
            order: true,
            updatedAt: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });
    return tiers.map((tier) => ({
      key: tier.key,
      title: text(tier.title),
      colour: tier.colour,
      order: tier.order,
      lessons: tier.lessons.map((lesson) => ({
        id: lesson.id,
        title: text(lesson.title),
        icon: lesson.icon as LessonIcon,
        order: lesson.order,
        questionCount: lesson._count.questions,
        updatedAt: lesson.updatedAt,
      })),
    }));
  }

  async findPublishedLesson(id: string): Promise<PublishedLessonRecord | null> {
    const row = await this.prisma.lesson.findFirst({
      where: { id, status: 'published' },
      select: {
        id: true,
        title: true,
        icon: true,
        updatedAt: true,
        tier: { select: { key: true } },
        questions: { orderBy: { order: 'asc' } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      tierKey: row.tier.key,
      title: text(row.title),
      icon: row.icon as LessonIcon,
      updatedAt: row.updatedAt,
      questions: row.questions.map((q) => ({
        id: q.id,
        order: q.order,
        prompt: text(q.prompt),
        hint: optionalText(q.hint),
        options: q.options as unknown as L10n[],
        correctIndex: q.correctIndex,
        explanation: text(q.explanation),
        wrongExplanation: optionalText(q.wrongExplanation),
        imageKey: q.imageKey,
      })),
    };
  }

  async completedLessonIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.lessonCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: 'asc' },
      select: { lessonId: true },
    });
    return rows.map((row) => row.lessonId);
  }

  countCompletionsSince(userId: string, since: Date): Promise<number> {
    return this.prisma.lessonCompletion.count({
      where: { userId, completedAt: { gte: since } },
    });
  }

  async hasCompletion(userId: string, lessonId: string): Promise<boolean> {
    const row = await this.prisma.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { id: true },
    });
    return row !== null;
  }

  /** Inserts the first completion; false when (userId, lessonId) already has one. */
  async insertCompletion(data: NewCompletion): Promise<boolean> {
    try {
      await this.prisma.lessonCompletion.create({ data, select: { id: true } });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }
}

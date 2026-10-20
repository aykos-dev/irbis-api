import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { QuestionContent } from './lesson.rules.js';
import type {
  L10n,
  LessonIcon,
  LessonStatusCode,
} from './lessons-admin.constants.js';
import {
  TierKeyTakenError,
  TierNotEmptyError,
} from './lessons-admin.errors.js';

export interface TierRecord {
  id: string;
  key: string;
  title: L10n;
  colour: string;
  order: number;
  lessonCount: number;
  publishedCount: number;
}

export interface LessonSummaryRecord {
  id: string;
  title: L10n;
  icon: LessonIcon;
  order: number;
  status: LessonStatusCode;
  questionCount: number;
  publishedAt: Date | null;
  updatedAt: Date;
}

export interface QuestionRecord extends QuestionContent {
  id: string;
  order: number;
}

export interface LessonRecord extends LessonSummaryRecord {
  tierId: string;
  questions: QuestionRecord[];
}

const json = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;
const optionalJson = (
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull =>
  value === null ? Prisma.DbNull : json(value);
const text = (value: Prisma.JsonValue): L10n => value as unknown as L10n;
const optionalText = (value: Prisma.JsonValue | null): L10n | null =>
  value === null ? null : text(value);

const hasErrorCode = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const summarySelect = {
  id: true,
  title: true,
  icon: true,
  order: true,
  status: true,
  publishedAt: true,
  updatedAt: true,
  _count: { select: { questions: true } },
} as const;

type SummaryRow = Prisma.LessonGetPayload<{ select: typeof summarySelect }>;

const toSummary = (row: SummaryRow): LessonSummaryRecord => ({
  id: row.id,
  title: text(row.title),
  icon: row.icon as LessonIcon,
  order: row.order,
  status: row.status,
  questionCount: row._count.questions,
  publishedAt: row.publishedAt,
  updatedAt: row.updatedAt,
});

const lessonInclude = {
  ...summarySelect,
  tierId: true,
  questions: { orderBy: { order: 'asc' } },
} as const;

type LessonRow = Prisma.LessonGetPayload<{ select: typeof lessonInclude }>;

const toLesson = (row: LessonRow): LessonRecord => ({
  ...toSummary(row),
  tierId: row.tierId,
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
});

/** Lesson tiers, lessons and their questions (admin content). */
@Injectable()
export class LessonsAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- tiers ---

  async listTiers(): Promise<TierRecord[]> {
    const [tiers, published] = await Promise.all([
      this.prisma.lessonTier.findMany({
        orderBy: { order: 'asc' },
        include: { _count: { select: { lessons: true } } },
      }),
      this.prisma.lesson.groupBy({
        by: ['tierId'],
        where: { status: 'published' },
        _count: { _all: true },
      }),
    ]);
    const publishedBy = new Map(
      published.map((row) => [row.tierId, row._count._all]),
    );
    return tiers.map((tier) => ({
      id: tier.id,
      key: tier.key,
      title: text(tier.title),
      colour: tier.colour,
      order: tier.order,
      lessonCount: tier._count.lessons,
      publishedCount: publishedBy.get(tier.id) ?? 0,
    }));
  }

  async findTier(id: string): Promise<TierRecord | null> {
    const tiers = await this.listTiers();
    return tiers.find((tier) => tier.id === id) ?? null;
  }

  async tierExists(id: string): Promise<boolean> {
    const row = await this.prisma.lessonTier.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  /** Appends the tier last. TIER_KEY_TAKEN when the key exists. */
  async createTier(data: {
    key: string;
    title: L10n;
    colour: string;
  }): Promise<string> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { _max } = await tx.lessonTier.aggregate({
          _max: { order: true },
        });
        const tier = await tx.lessonTier.create({
          data: {
            ...data,
            title: json(data.title),
            order: (_max.order ?? 0) + 1,
          },
          select: { id: true },
        });
        return tier.id;
      });
    } catch (error) {
      if (hasErrorCode(error, 'P2002')) throw new TierKeyTakenError();
      throw error;
    }
  }

  /** False when the tier does not exist. */
  async updateTier(
    id: string,
    data: { title?: L10n; colour?: string },
  ): Promise<boolean> {
    const { count } = await this.prisma.lessonTier.updateMany({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: json(data.title) }),
        ...(data.colour !== undefined && { colour: data.colour }),
      },
    });
    return count > 0;
  }

  async tierIds(): Promise<string[]> {
    const rows = await this.prisma.lessonTier.findMany({
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /** Orders become 1..n in the given id order. */
  async reorderTiers(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.lessonTier.update({
          where: { id },
          data: { order: i + 1 },
        }),
      ),
    );
  }

  /** TIER_NOT_EMPTY when a lesson still references the tier. */
  async deleteTier(id: string): Promise<void> {
    try {
      await this.prisma.lessonTier.delete({ where: { id } });
    } catch (error) {
      if (hasErrorCode(error, 'P2003')) throw new TierNotEmptyError();
      throw error;
    }
  }

  // --- lessons ---

  async listLessons(tierId: string): Promise<LessonSummaryRecord[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { tierId },
      orderBy: { order: 'asc' },
      select: summarySelect,
    });
    return rows.map(toSummary);
  }

  async lessonIds(tierId: string): Promise<string[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { tierId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /** Orders become 1..n in the given id order. */
  async reorderLessons(ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.lesson.update({ where: { id }, data: { order: i + 1 } }),
      ),
    );
  }

  /** A draft with no questions, appended last in its tier. */
  async createLesson(data: {
    tierId: string;
    title: L10n;
    icon: LessonIcon;
  }): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const { _max } = await tx.lesson.aggregate({
        where: { tierId: data.tierId },
        _max: { order: true },
      });
      const lesson = await tx.lesson.create({
        data: {
          ...data,
          title: json(data.title),
          order: (_max.order ?? 0) + 1,
        },
        select: { id: true },
      });
      return lesson.id;
    });
  }

  async findLesson(id: string): Promise<LessonRecord | null> {
    const row = await this.prisma.lesson.findUnique({
      where: { id },
      select: lessonInclude,
    });
    return row ? toLesson(row) : null;
  }

  /** Replaces title, icon and every question in one transaction; array order = question order. */
  async replaceLesson(
    id: string,
    data: { title: L10n; icon: LessonIcon; questions: QuestionContent[] },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.update({
        where: { id },
        data: { title: json(data.title), icon: data.icon },
      });
      await tx.lessonQuestion.deleteMany({ where: { lessonId: id } });
      if (data.questions.length === 0) return;
      await tx.lessonQuestion.createMany({
        data: data.questions.map((q, i) => ({
          lessonId: id,
          order: i + 1,
          prompt: json(q.prompt),
          hint: optionalJson(q.hint),
          options: json(q.options),
          correctIndex: q.correctIndex,
          explanation: json(q.explanation),
          wrongExplanation: optionalJson(q.wrongExplanation),
          imageKey: q.imageKey,
        })),
      });
    });
  }

  async setStatus(
    id: string,
    status: LessonStatusCode,
    publishedAt: Date | null,
  ): Promise<void> {
    await this.prisma.lesson.update({
      where: { id },
      data: { status, publishedAt },
    });
  }

  async deleteLesson(id: string): Promise<void> {
    await this.prisma.lesson.delete({ where: { id } });
  }
}

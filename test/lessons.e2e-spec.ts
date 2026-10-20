import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedGameConfig, seedLessonsConfig } from '../prisma/seed/seed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { type Account, bearer, signUp } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const text = (word: string) => ({
  uz: `${word}_uz`,
  ru: `${word}_ru`,
  en: `${word}_en`,
});
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

interface SeededLesson {
  id: string;
  questions: { id: string; correctIndex: number }[];
}

describe('lessons (e2e) - AC1, AC2, AC3', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const published: SeededLesson[] = [];
  let draft: SeededLesson;

  const server = () => app.getHttpServer();
  const complete = (account: Account, body: Record<string, unknown>) =>
    request(server())
      .post('/v1/me/lesson-completions')
      .set(...bearer(account.accessToken))
      .send(body);
  const run = (lesson: SeededLesson, wrongs = 0) => ({
    lessonId: lesson.id,
    completedAt: new Date().toISOString(),
    attempts: [
      ...Array.from({ length: wrongs }, () => ({
        questionId: lesson.questions[0].id,
        optionIndex: (lesson.questions[0].correctIndex + 1) % 2,
      })),
      ...lesson.questions.map((q) => ({
        questionId: q.id,
        optionIndex: q.correctIndex,
      })),
    ],
  });
  const ledgerRows = (userId: string, refId: string) =>
    prisma.xpEntry.count({ where: { userId, source: 'lesson', refId } });

  async function createLesson(
    tierId: string,
    order: number,
    status: 'draft' | 'published',
  ) {
    const lesson = await prisma.lesson.create({
      data: {
        tierId,
        title: text(`lesson${order}`),
        icon: 'compass',
        order,
        status,
        publishedAt: status === 'published' ? new Date() : null,
        questions: {
          create: Array.from({ length: 5 }, (_, i) => ({
            order: i + 1,
            prompt: text(`q${i}`),
            options: [text('a'), text('b')],
            correctIndex: i % 2,
            explanation: text('why'),
          })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    return {
      id: lesson.id,
      questions: lesson.questions.map((q) => ({
        id: q.id,
        correctIndex: q.correctIndex,
      })),
    };
  }

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedLessonsConfig(prisma);
    const tier1 = await prisma.lessonTier.create({
      data: { key: 'e2e-1', title: text('tier1'), colour: '#58CC02', order: 1 },
    });
    await prisma.lessonTier.create({
      data: {
        key: 'e2e-empty',
        title: text('tier2'),
        colour: '#1CB0F6',
        order: 2,
      },
    });
    for (let order = 1; order <= 4; order += 1) {
      published.push(await createLesson(tier1.id, order, 'published'));
    }
    draft = await createLesson(tier1.id, 5, 'draft');
  });

  afterAll(async () => {
    await app.close();
    await db.stop();
  });

  describe('AC1 catalog and lesson', () => {
    it('guest sees config, published lessons only, tiers with lessons only, progress null', async () => {
      const res = await request(server()).get('/v1/lessons').expect(200);
      expect(res.body.config).toEqual({
        heartsPerDay: 5,
        xpFirst: 10,
        xpPerfect: 15,
        dailyGoal: 3,
      });
      expect(res.body.progress).toBeNull();
      const tiers = res.body.tiers as {
        key: string;
        lessons: { id: string }[];
      }[];
      expect(tiers.map((t) => t.key)).toEqual(['e2e-1']);
      const ids = tiers[0].lessons.map((l) => l.id);
      expect(ids).toEqual(published.map((l) => l.id));
      expect(res.body.tiers[0].lessons[0]).toMatchObject({
        questionCount: 5,
        icon: 'compass',
      });
    });

    it('signed-in progress: doneToday counts only completions since 00:00 Tashkent', async () => {
      const user = await signUp(app);
      await complete(user, run(published[0])).expect(200);
      await prisma.lessonCompletion.create({
        data: {
          userId: user.id,
          lessonId: published[1].id,
          completedAt: new Date(Date.now() - 2 * 24 * 3_600_000),
          wrongCount: 0,
          perfect: true,
          xp: 15,
        },
      });
      const res = await request(server())
        .get('/v1/lessons')
        .set(...bearer(user.accessToken))
        .expect(200);
      expect(res.body.progress.doneToday).toBe(1);
      expect(
        [...(res.body.progress.completedLessonIds as string[])].sort(),
      ).toEqual([published[0].id, published[1].id].sort());
    });

    it('GET /v1/lessons/:id: published 200 with questions; draft, unknown and bad id 404', async () => {
      const ok = await request(server())
        .get(`/v1/lessons/${published[0].id}`)
        .expect(200);
      expect(ok.body).toMatchObject({ id: published[0].id, tierKey: 'e2e-1' });
      expect(ok.body.questions).toHaveLength(5);
      expect(ok.body.questions[0]).toMatchObject({
        order: 1,
        correctIndex: 0,
        image: null,
      });
      for (const id of [draft.id, UNKNOWN_ID, 'not-a-uuid']) {
        const res = await request(server())
          .get(`/v1/lessons/${id}`)
          .expect(404);
        expect(res.body.code).toBe('LESSON_NOT_FOUND');
      }
    });
  });

  describe('AC2 completions', () => {
    it('perfect → 15 XP and a lesson fact; repeat → 0 with no second ledger row', async () => {
      const user = await signUp(app);
      const first = await complete(user, run(published[0])).expect(200);
      expect(first.body).toMatchObject({
        firstCompletion: true,
        perfect: true,
        xpAwarded: 15,
        doneToday: 1,
        dailyGoal: 3,
        levelUps: [],
      });
      const level = await request(server())
        .get('/v1/me/level')
        .set(...bearer(user.accessToken))
        .expect(200);
      expect(level.body.next.lessons.current).toBe(1);

      const again = await complete(user, run(published[0])).expect(200);
      expect(again.body).toMatchObject({
        firstCompletion: false,
        xpAwarded: 0,
      });
      expect(await ledgerRows(user.id, published[0].id)).toBe(1);
    });

    it('one wrong → 10 XP; an unknown question id is accepted for 10 XP', async () => {
      const user = await signUp(app);
      const wrong = await complete(user, run(published[1], 1)).expect(200);
      expect(wrong.body).toMatchObject({ perfect: false, xpAwarded: 10 });

      const stale = run(published[2]);
      stale.attempts = [
        ...stale.attempts.slice(1),
        { questionId: UNKNOWN_ID, optionIndex: 0 },
      ];
      const res = await complete(user, stale).expect(200);
      expect(res.body).toMatchObject({
        firstCompletion: true,
        perfect: false,
        xpAwarded: 10,
      });
    });

    it('missing correct answer or 5 wrongs → 400 at attempts; draft → 404; no token → 401', async () => {
      const user = await signUp(app);
      const missing = run(published[0]);
      missing.attempts = missing.attempts.slice(1);
      const res = await complete(user, missing).expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.fieldErrors.attempts).toEqual(['notAllAnswered']);
      const tooMany = await complete(user, run(published[0], 5)).expect(400);
      expect(tooMany.body.fieldErrors.attempts).toEqual(['tooManyWrong']);
      expect(await ledgerRows(user.id, published[0].id)).toBe(0);

      const notFound = await complete(user, run(draft)).expect(404);
      expect(notFound.body.code).toBe('LESSON_NOT_FOUND');
      await request(server())
        .post('/v1/me/lesson-completions')
        .send(run(published[0]))
        .expect(401);
    });
  });

  describe('AC3 guest merge', () => {
    it('2 completions → XP once each; second merge adds nothing; invalid entry skipped', async () => {
      const user = await signUp(app);
      const invalid = run(published[3]);
      invalid.attempts = invalid.attempts.slice(1);
      const body = {
        lessons: {
          completions: [
            run(published[0]),
            run(published[1], 1),
            invalid,
            { lessonId: 'junk' },
          ],
        },
      };
      const merge = () =>
        request(server())
          .post('/v1/me/guest-merge')
          .set(...bearer(user.accessToken))
          .send(body)
          .expect(200);

      const first = await merge();
      expect(first.body.merged).toContain('lessons');
      const xpAfterFirst = (
        await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      ).xpTotal;
      expect(xpAfterFirst).toBe(25);
      expect(
        await prisma.lessonCompletion.count({ where: { userId: user.id } }),
      ).toBe(2);

      await merge();
      const xpAfterSecond = (
        await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      ).xpTotal;
      expect(xpAfterSecond).toBe(25);
      expect(await prisma.xpEntry.count({ where: { userId: user.id } })).toBe(
        2,
      );
    });
  });
});

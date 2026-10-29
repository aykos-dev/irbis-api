import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import {
  seedCheckInConfig,
  seedGameConfig,
  seedLessonsConfig,
  seedPathConfig,
  seedStreaksConfig,
} from '../prisma/seed/seed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { bearer, signUp, type Account } from './setup/auth.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

const PEAK = { lat: 41.31, lng: 69.28 };
const text = (word: string) => ({
  uz: `${word}_uz`,
  ru: `${word}_ru`,
  en: `${word}_en`,
});

describe('streaks (e2e) - AC1, AC2, AC4, AC5', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let placeId: string;
  let lesson: { id: string; questions: { id: string; correctIndex: number }[] };
  const server = () => app.getHttpServer();

  const streaks = (user: Account) =>
    request(server())
      .get('/v1/me/streaks')
      .set(...bearer(user.accessToken));

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    await seedGameConfig(prisma);
    await seedLessonsConfig(prisma);
    await seedPathConfig(prisma);
    await seedCheckInConfig(prisma);
    await seedStreaksConfig(prisma);
    const place = await prisma.place.create({
      data: {
        slug: 'streak-peak',
        nameUz: 'streak-peak',
        type: 'peak',
        latitude: PEAK.lat,
        longitude: PEAK.lng,
        elevationM: 2000,
        difficulty: 1,
        requiredLevel: 1,
      },
    });
    placeId = place.id;
    const tier = await prisma.lessonTier.create({
      data: {
        key: 'streak-1',
        title: text('tier'),
        colour: '#58CC02',
        order: 1,
      },
    });
    const created = await prisma.lesson.create({
      data: {
        tierId: tier.id,
        title: text('lesson'),
        icon: 'compass',
        order: 1,
        status: 'published',
        publishedAt: new Date(),
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
    lesson = {
      id: created.id,
      questions: created.questions.map(({ id, correctIndex }) => ({
        id,
        correctIndex,
      })),
    };
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it('a fresh user gets zeros and 2 freezes left', async () => {
    const user = await signUp(app);
    const res = await streaks(user).expect(200);
    expect(res.body).toEqual({
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
      flame: { count: 0, doneToday: false, atRisk: false },
      boot: { count: 0, doneThisWeek: false, shieldedLastWeek: false },
      freezes: { left: 2, perMonth: 2, usedThisMonth: [] },
    });
  });

  it('a lesson today lights the flame (1, done today)', async () => {
    const user = await signUp(app);
    await request(server())
      .post('/v1/me/lesson-completions')
      .set(...bearer(user.accessToken))
      .send({
        lessonId: lesson.id,
        completedAt: new Date().toISOString(),
        attempts: lesson.questions.map((q) => ({
          questionId: q.id,
          optionIndex: q.correctIndex,
        })),
      })
      .expect(200);
    const res = await streaks(user).expect(200);
    expect(res.body.flame).toEqual({
      count: 1,
      doneToday: true,
      atRisk: false,
    });
    expect(res.body.boot.count).toBe(0);
  });

  it('a check-in starts the boot (1, done this week) and the flame', async () => {
    const user = await signUp(app);
    await request(server())
      .post('/v1/check-ins')
      .set(...bearer(user.accessToken))
      .send({
        clientId: randomUUID(),
        placeId,
        lat: PEAK.lat,
        lng: PEAK.lng,
        accuracyM: 10,
        recordedAt: new Date().toISOString(),
      })
      .expect(201);
    const res = await streaks(user).expect(200);
    expect(res.body.boot).toEqual({
      count: 1,
      doneThisWeek: true,
      shieldedLastWeek: false,
    });
    expect(res.body.flame.count).toBe(1);
  });
});

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { seedGameConfig } from '../prisma/seed/seed.js';
import { LevelsService } from '../src/features/levels/levels.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './setup/app.js';
import { e2eEnv, startPostgres } from './setup/postgres.js';

// No endpoints in this slice: this checks the real repository (ledger, caps, level-ups) on Postgres.
describe('levels engine on Postgres (e2e) - AC1, AC2', () => {
  let db: StartedPostgreSqlContainer;
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let levels: LevelsService;
  let seq = 0;

  async function createUser(): Promise<string> {
    seq += 1;
    const user = await prisma.user.create({
      data: { username: `levels_${seq}`, passwordHash: 'x', locale: 'uz' },
    });
    return user.id;
  }

  beforeAll(async () => {
    db = await startPostgres();
    app = await createE2eApp(e2eEnv(db.getConnectionUri()));
    prisma = app.get(PrismaService);
    levels = app.get(LevelsService);
    expect(await seedGameConfig(prisma)).toBe(2);
    expect(await seedGameConfig(prisma)).toBe(2);
  });

  afterAll(async () => {
    await app.close();
    await db.stop();
  });

  it('awards once per refId, even concurrently, and trims a capped source', async () => {
    const userId = await createUser();
    const award = {
      userId,
      source: 'lesson' as const,
      refId: 'lesson_1',
      amount: 50,
    };
    const results = await Promise.all([
      levels.award(award),
      levels.award(award),
    ]);
    expect(results.filter((r) => r.created)).toHaveLength(1);

    await levels.award({ userId, source: 'game', refId: 'g1', amount: 28 });
    const trimmed = await levels.award({
      userId,
      source: 'game',
      refId: 'g2',
      amount: 5,
    });
    expect(trimmed).toMatchObject({
      created: true,
      capped: true,
      entry: { amount: 2 },
    });

    expect(await prisma.xpEntry.count({ where: { userId } })).toBe(3);
    expect((await levels.getState(userId)).xpTotal).toBe(80);
  });

  it('levels up through every met level, one LevelUp per step', async () => {
    const userId = await createUser();
    for (let i = 1; i <= 6; i += 1) {
      await levels.recordFact({
        userId,
        kind: 'lesson',
        refId: `l${i}`,
        tier: '2',
      });
    }
    for (let i = 1; i <= 5; i += 1) {
      await levels.recordFact({
        userId,
        kind: 'check_in',
        refId: `c${i}`,
        difficulty: 3,
      });
    }
    const result = await levels.award({
      userId,
      source: 'qa_grant',
      refId: 'grant_1',
      amount: 1_000,
    });

    expect(result.levelUps.map((l) => [l.fromLevel, l.toLevel])).toEqual([
      [1, 2],
      [2, 3],
    ]);
    const state = await levels.getState(userId);
    expect(state).toMatchObject({
      level: 3,
      xpTotal: 1_000,
      counts: {
        lessonsTotal: 6,
        lessonsByTier: { '2': 6 },
        checkInsByDifficulty: { 3: 5 },
      },
    });
    expect(await prisma.levelUp.count({ where: { userId } })).toBe(2);
  });
});

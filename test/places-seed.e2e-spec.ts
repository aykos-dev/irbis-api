import { PrismaPg } from '@prisma/adapter-pg';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { seedPlaces } from '../prisma/seed/seed.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { startPostgres } from './setup/postgres.js';

const SEEDED_PLACES = 71;

describe('places seed (e2e) - AC1', () => {
  let db: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    db = await startPostgres();
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: db.getConnectionUri() }),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await db.stop();
  });

  it('upserts every place and running it again adds nothing', async () => {
    expect(await seedPlaces(prisma)).toBe(SEEDED_PLACES);
    expect(await prisma.place.count()).toBe(SEEDED_PLACES);

    expect(await seedPlaces(prisma)).toBe(SEEDED_PLACES);
    expect(await prisma.place.count()).toBe(SEEDED_PLACES);

    const qorangur = await prisma.place.findUnique({
      where: { slug: 'qorangur-2941' },
    });
    expect(qorangur).toMatchObject({
      nameUz: 'Qorangur',
      difficulty: 3,
      requiredLevel: 3,
      type: 'peak',
    });
  });
});

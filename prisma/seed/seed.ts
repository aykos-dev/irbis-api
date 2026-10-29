/**
 * Idempotent seed: upserts every place from places.data.ts by slug and the GameConfig rows
 * from game-config.data.ts by key; adds the draft lessons from lessons.data.ts to every tier
 * that has no lesson yet.
 *
 *   npm run db:seed
 *
 * Runs through `prisma db seed`, so DATABASE_URL comes from prisma.config.ts (local env file
 * or a real environment variable).
 */
import { pathToFileURL } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  checkInConfigRows,
  gameConfigRows,
  lessonsConfigRow,
  pathConfigRows,
  tripConfigRows,
} from './game-config.data.js';
import { toLessonSeedRows, type LessonSeedRow } from './lesson-seed.rules.js';
import { lessonSources } from './lessons.data.js';
import { toSeedRows } from './place-seed.rules.js';
import { modifiedLocations } from './places.data.js';

/** Upserts every place from places.data.ts by slug in one transaction; returns the row count seeded. */
export async function seedPlaces(prisma: PrismaClient): Promise<number> {
  const rows = toSeedRows(modifiedLocations);
  await prisma.$transaction(
    rows.map(({ slug, ...data }) =>
      prisma.place.upsert({
        where: { slug },
        create: { slug, ...data },
        update: data,
      }),
    ),
  );
  return rows.length;
}

/** Upserts the levels GameConfig rows by key in one transaction; returns the row count seeded. */
export async function seedGameConfig(prisma: PrismaClient): Promise<number> {
  return upsertGameConfig(prisma, gameConfigRows);
}

/** Upserts the weekly-path GameConfig row (`path.config`); returns the row count seeded. */
export async function seedPathConfig(prisma: PrismaClient): Promise<number> {
  return upsertGameConfig(prisma, pathConfigRows);
}

/** Upserts the trip GameConfig rows (`trip.config`, `trip.active`); returns the row count seeded. */
export async function seedTripConfig(prisma: PrismaClient): Promise<number> {
  return upsertGameConfig(prisma, tripConfigRows);
}

/** Upserts the check-in GameConfig row (`checkIn.config`); returns the row count seeded. */
export async function seedCheckInConfig(prisma: PrismaClient): Promise<number> {
  return upsertGameConfig(prisma, checkInConfigRows);
}

async function upsertGameConfig(
  prisma: PrismaClient,
  rows: readonly { key: string; value: object }[],
): Promise<number> {
  await prisma.$transaction(
    rows.map(({ key, value }) =>
      prisma.gameConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
  return rows.length;
}

/** Upserts the `lessons.config` GameConfig row by key. */
export async function seedLessonsConfig(prisma: PrismaClient): Promise<void> {
  const { key, value } = lessonsConfigRow;
  await prisma.gameConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/**
 * Creates the draft lessons of every tier that has no lesson yet (admin edits are never touched);
 * returns the lesson count created. Throws when a tier key is missing.
 */
export async function seedLessons(prisma: PrismaClient): Promise<number> {
  const byTier = new Map<string, LessonSeedRow[]>();
  for (const row of toLessonSeedRows(lessonSources)) {
    byTier.set(row.tierKey, [...(byTier.get(row.tierKey) ?? []), row]);
  }
  let created = 0;
  for (const [key, rows] of byTier) {
    const tier = await prisma.lessonTier.findUnique({
      where: { key },
      select: { id: true, _count: { select: { lessons: true } } },
    });
    if (!tier) throw new Error(`Lesson tier "${key}" not found`);
    if (tier._count.lessons > 0) continue;
    await prisma.$transaction(
      rows.map((row) =>
        prisma.lesson.create({
          data: {
            tierId: tier.id,
            title: { ...row.title },
            icon: row.icon,
            order: row.order,
            status: 'draft',
            questions: {
              create: row.questions.map((q) => ({
                order: q.order,
                prompt: { ...q.prompt },
                ...(q.hint ? { hint: { ...q.hint } } : {}),
                options: q.options.map((o) => ({ ...o })),
                correctIndex: q.correctIndex,
                explanation: { ...q.explanation },
                wrongExplanation: { ...q.wrongExplanation },
              })),
            },
          },
        }),
      ),
    );
    created += rows.length;
  }
  return created;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const seeded = await seedPlaces(prisma);
    const total = await prisma.place.count();
    await seedLessonsConfig(prisma);
    const configRows =
      (await seedGameConfig(prisma)) +
      1 +
      (await seedPathConfig(prisma)) +
      (await seedTripConfig(prisma)) +
      (await seedCheckInConfig(prisma));
    const lessons = await seedLessons(prisma);
    process.stdout.write(
      `Seeded ${seeded} places; ${total} in the database. Seeded ${configRows} game config rows. Created ${lessons} draft lessons.\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}

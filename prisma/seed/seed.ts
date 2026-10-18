/**
 * Idempotent seed: upserts every place from places.data.ts by slug and the GameConfig rows
 * from game-config.data.ts by key.
 *
 *   npm run db:seed
 *
 * Runs through `prisma db seed`, so DATABASE_URL comes from prisma.config.ts (local env file
 * or a real environment variable).
 */
import { pathToFileURL } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { gameConfigRows } from './game-config.data.js';
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

/** Upserts the GameConfig rows by key in one transaction; returns the row count seeded. */
export async function seedGameConfig(prisma: PrismaClient): Promise<number> {
  await prisma.$transaction(
    gameConfigRows.map(({ key, value }) =>
      prisma.gameConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
  return gameConfigRows.length;
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
    const configRows = await seedGameConfig(prisma);
    process.stdout.write(
      `Seeded ${seeded} places; ${total} in the database. Seeded ${configRows} game config rows.\n`,
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

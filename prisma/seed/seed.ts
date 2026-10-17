/**
 * Idempotent seed: upserts every place from places.data.ts by slug.
 *
 *   npm run db:seed
 *
 * Runs through `prisma db seed`, so DATABASE_URL comes from prisma.config.ts (local env file
 * or a real environment variable).
 */
import { pathToFileURL } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
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

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const seeded = await seedPlaces(prisma);
    const total = await prisma.place.count();
    process.stdout.write(
      `Seeded ${seeded} places; ${total} in the database.\n`,
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

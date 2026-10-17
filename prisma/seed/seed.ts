/**
 * Idempotent seed: upserts every place from places.data.ts by slug.
 *
 *   npm run db:seed
 *
 * Runs through `prisma db seed`, so DATABASE_URL comes from prisma.config.ts (local env file
 * or a real environment variable).
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { toSeedRows } from './place-seed.rules.js';
import { modifiedLocations } from './places.data.js';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const rows = toSeedRows(modifiedLocations);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await prisma.$transaction(
      rows.map(({ slug, ...data }) =>
        prisma.place.upsert({
          where: { slug },
          create: { slug, ...data },
          update: data,
        }),
      ),
    );
    const total = await prisma.place.count();
    process.stdout.write(
      `Seeded ${rows.length} places; ${total} in the database.\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});

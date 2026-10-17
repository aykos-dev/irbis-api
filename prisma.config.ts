import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma CLI config (migrate, generate). The app itself reads DATABASE_URL via src/config.
// Local development keeps it in the git-ignored env file next to this one; deployed
// environments inject it as a real environment variable.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Compiled by `npm run db:seed` (tsconfig.scripts.json) before Prisma runs it.
    seed: 'node dist-scripts/prisma/seed/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});

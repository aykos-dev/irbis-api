import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

/** Throwaway Postgres 17 for one e2e file, with all migrations applied. */
export async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  const container = await new PostgreSqlContainer('postgres:17').start();
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
    stdio: 'pipe',
  });
  return container;
}

/** Environment for an e2e app instance. Secrets are random per run and never leave the process. */
export function e2eEnv(databaseUrl: string): Record<string, string> {
  return {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    CORS_ORIGINS: 'http://localhost:3001',
    JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
    DATABASE_URL: databaseUrl,
  };
}

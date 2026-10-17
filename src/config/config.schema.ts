import { z } from 'zod';

const csv = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )
  .pipe(
    z
      .array(
        z.url().refine((url) => url !== '*', 'wildcard origin not allowed'),
      )
      .min(1),
  );

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGINS: csv,
  BODY_LIMIT: z
    .string()
    .regex(/^\d+(b|kb|mb)$/, 'expected a size like 100kb')
    .default('100kb'),
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  // Deployment tier. Staging and prod must never use the fake SMS sender.
  APP_ENV: z.enum(['local', 'test', 'staging', 'prod']).default('local'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  // Argon2id cost (OWASP minimum: 19 MiB, 2 passes, 1 lane). Tests lower it for speed.
  ARGON2_MEMORY_KIB: z.coerce.number().int().min(8).default(19_456),
  ARGON2_TIME_COST: z.coerce.number().int().min(1).default(2),
  // Base64 of 32 random bytes; encrypts recovery phones at rest. Required in staging/prod.
  PHONE_ENCRYPTION_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  SMS_PROVIDER: z.enum(['fake']).default('fake'),
  // Per-IP limits (requests per window) on sign-up, log-in, refresh, reset, and username lookups.
  AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(20),
  AUTH_THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  LOOKUP_THROTTLE_LIMIT: z.coerce.number().int().positive().default(30),
  // Origin for place distances when the client sends no position (Tashkent centre).
  PLACES_FALLBACK_LAT: z.coerce.number().min(-90).max(90).default(41.2995),
  PLACES_FALLBACK_LNG: z.coerce.number().min(-180).max(180).default(69.2401),
  // Level every viewer has until the levels feature ships.
  LEVELS_START_LEVEL: z.coerce.number().int().min(1).max(7).default(1),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'expected a postgresql:// connection string'),
});

export type Env = z.infer<typeof configSchema>;

const PHONE_KEY_BYTES = 32;

/**
 * Validates raw environment variables. Throws (and so stops the boot) when anything
 * is missing or malformed. Error lists variable names and issues only, never values.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = configSchema.safeParse(raw);
  const issues: string[] = parsed.success
    ? []
    : parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
  if (parsed.success) {
    issues.push(...crossFieldIssues(parsed.data));
  }
  if (!parsed.success || issues.length > 0) {
    throw new Error(`Invalid environment configuration: ${issues.join('; ')}`);
  }
  return parsed.data;
}

/** True when the process runs somewhere real users or real data live. */
export function isDeployedEnv(env: Pick<Env, 'APP_ENV' | 'NODE_ENV'>): boolean {
  return (
    env.APP_ENV === 'staging' ||
    env.APP_ENV === 'prod' ||
    env.NODE_ENV === 'production'
  );
}

function crossFieldIssues(env: Env): string[] {
  const issues: string[] = [];
  if (env.SMS_PROVIDER === 'fake' && isDeployedEnv(env)) {
    issues.push(
      'SMS_PROVIDER: the fake SMS sender is for local and test only (APP_ENV staging/prod, NODE_ENV production)',
    );
  }
  if (isDeployedEnv(env) && !env.PHONE_ENCRYPTION_KEY) {
    issues.push('PHONE_ENCRYPTION_KEY: required in staging and production');
  }
  if (
    env.PHONE_ENCRYPTION_KEY &&
    Buffer.from(env.PHONE_ENCRYPTION_KEY, 'base64').length !== PHONE_KEY_BYTES
  ) {
    issues.push('PHONE_ENCRYPTION_KEY: expected base64 of 32 bytes');
  }
  return issues;
}

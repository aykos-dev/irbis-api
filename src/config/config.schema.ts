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
  JWT_ACCESS_SECRET: z.string().min(32),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'expected a postgresql:// connection string'),
});

export type Env = z.infer<typeof configSchema>;

/**
 * Validates raw environment variables. Throws (and so stops the boot) when anything
 * is missing or malformed. Error lists variable names and issues only, never values.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

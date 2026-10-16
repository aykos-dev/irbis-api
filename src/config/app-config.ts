import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './config.schema.js';

/** Typed, validated configuration. Inject this instead of reading the environment. */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get port(): number {
    return this.get('PORT');
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS');
  }

  get bodyLimit(): string {
    return this.get('BODY_LIMIT');
  }

  get throttle(): { ttlMs: number; limit: number } {
    return {
      ttlMs: this.get('THROTTLE_TTL_MS'),
      limit: this.get('THROTTLE_LIMIT'),
    };
  }

  get jwtAccessSecret(): string {
    return this.get('JWT_ACCESS_SECRET');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }
}

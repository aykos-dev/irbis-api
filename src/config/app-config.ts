import { hkdfSync } from 'node:crypto';
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

  get appEnv(): Env['APP_ENV'] {
    return this.get('APP_ENV');
  }

  get jwtAccessSecret(): string {
    return this.get('JWT_ACCESS_SECRET');
  }

  get jwtAccessTtlSec(): number {
    return this.get('JWT_ACCESS_TTL_SEC');
  }

  get refreshTtlDays(): number {
    return this.get('REFRESH_TTL_DAYS');
  }

  get argon2(): { memoryCost: number; timeCost: number } {
    return {
      memoryCost: this.get('ARGON2_MEMORY_KIB'),
      timeCost: this.get('ARGON2_TIME_COST'),
    };
  }

  /** 32-byte key for recovery phones. Local/test without PHONE_ENCRYPTION_KEY derive one from the JWT secret. */
  get phoneEncryptionKey(): Buffer {
    const configured = this.get('PHONE_ENCRYPTION_KEY');
    if (configured) {
      return Buffer.from(configured, 'base64');
    }
    return Buffer.from(
      hkdfSync(
        'sha256',
        this.jwtAccessSecret,
        'irbis',
        'phone-encryption-v1',
        32,
      ),
    );
  }

  get smsProvider(): Env['SMS_PROVIDER'] {
    return this.get('SMS_PROVIDER');
  }

  get authThrottle(): { limit: number; ttlMs: number } {
    return {
      limit: this.get('AUTH_THROTTLE_LIMIT'),
      ttlMs: this.get('AUTH_THROTTLE_TTL_MS'),
    };
  }

  get lookupThrottle(): { limit: number; ttlMs: number } {
    return {
      limit: this.get('LOOKUP_THROTTLE_LIMIT'),
      ttlMs: this.get('AUTH_THROTTLE_TTL_MS'),
    };
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }
}

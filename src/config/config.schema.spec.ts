import { randomBytes } from 'node:crypto';
import { validateEnv } from './config.schema.js';

const base = {
  CORS_ORIGINS: 'http://localhost:3001',
  JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
  DATABASE_URL: 'postgresql://user@localhost:5432/db',
};

describe('config: SMS sender safety (Q7)', () => {
  it('boots locally and in tests with the fake sender', () => {
    expect(validateEnv({ ...base }).APP_ENV).toBe('local');
    expect(validateEnv({ ...base, APP_ENV: 'test' }).SMS_PROVIDER).toBe('fake');
  });

  it.each(['staging', 'prod'])(
    'refuses to boot with the fake sender when APP_ENV=%s',
    (env) => {
      expect(() =>
        validateEnv({
          ...base,
          APP_ENV: env,
          PHONE_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
        }),
      ).toThrow(/SMS_PROVIDER/);
    },
  );

  it('refuses to boot with the fake sender when NODE_ENV=production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /SMS_PROVIDER/,
    );
  });

  it('requires a valid phone encryption key when deployed, and checks its size anywhere', () => {
    expect(() => validateEnv({ ...base, APP_ENV: 'prod' })).toThrow(
      /PHONE_ENCRYPTION_KEY/,
    );
    expect(() =>
      validateEnv({ ...base, PHONE_ENCRYPTION_KEY: 'c2hvcnQ=' }),
    ).toThrow(/PHONE_ENCRYPTION_KEY/);
    expect(
      validateEnv({
        ...base,
        PHONE_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      }),
    ).toBeDefined();
  });

  it('treats an empty PHONE_ENCRYPTION_KEY (as copied from .env.example) as unset', () => {
    expect(
      validateEnv({ ...base, PHONE_ENCRYPTION_KEY: '' }).PHONE_ENCRYPTION_KEY,
    ).toBeUndefined();
    expect(() =>
      validateEnv({ ...base, APP_ENV: 'prod', PHONE_ENCRYPTION_KEY: '' }),
    ).toThrow(/PHONE_ENCRYPTION_KEY/);
  });

  it('never echoes values in the error', () => {
    expect(() => validateEnv({ ...base, APP_ENV: 'prod' })).not.toThrow(
      new RegExp(base.JWT_ACCESS_SECRET),
    );
  });
});

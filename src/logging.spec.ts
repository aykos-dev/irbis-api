import pino from 'pino';
import { Writable } from 'node:stream';
import { REDACT_PATHS } from './logging.js';

describe('log redaction (no codes, phones or credentials in logs)', () => {
  function logged(payload: Record<string, unknown>): string {
    let out = '';
    const sink = new Writable({
      write(chunk: Buffer, _enc, done) {
        out += chunk.toString();
        done();
      },
    });
    pino({ redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } }, sink).info(
      payload,
      'req',
    );
    return out;
  }

  it.each([
    ['sms code in a body', { req: { body: { code: '123456' } } }],
    ['phone in a body', { req: { body: { phone: '+998900000001' } } }],
    [
      'recovery phone at sign-up',
      { req: { body: { recoveryPhone: '+998900000001' } } },
    ],
    ['new password', { req: { body: { newPassword: 'pw-secret-1' } } }],
    ['password', { req: { body: { password: 'pw-secret-1' } } }],
    ['refresh token', { req: { body: { refreshToken: 'rt-secret' } } }],
    [
      'authorization header',
      { req: { headers: { authorization: 'Bearer rt-secret' } } },
    ],
    [
      'cookie header',
      { req: { headers: { cookie: 'irbis_admin_refresh=rt-secret' } } },
    ],
    [
      'set-cookie header',
      { res: { headers: { 'set-cookie': 'irbis_admin_refresh=rt-secret' } } },
    ],
  ])('redacts %s', (_name, payload) => {
    const line = logged(payload);
    expect(line).toContain('[REDACTED]');
    expect(line).not.toMatch(/123456|900000001|pw-secret-1|rt-secret/);
  });
});

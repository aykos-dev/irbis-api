import { randomBytes } from 'node:crypto';
import { decodeCursor, encodeCursor } from './cursor.js';
import { minusDays, startOfTashkentDay } from './dates.js';
import { decryptField, encryptField } from './field-cipher.js';

describe('field cipher', () => {
  const key = randomBytes(32);

  it('round-trips and never repeats a ciphertext', () => {
    const a = encryptField(key, '+998XXXXXXXXX');
    const b = encryptField(key, '+998XXXXXXXXX');
    expect(a).not.toEqual(b);
    expect(a).not.toContain('998');
    expect(decryptField(key, a)).toBe('+998XXXXXXXXX');
  });

  it('rejects another key and tampered values', () => {
    const stored = encryptField(key, 'secret');
    expect(() => decryptField(randomBytes(32), stored)).toThrow();
    const [version, iv, tag, body] = stored.split('.');
    const flipped = Buffer.from(body, 'base64url');
    flipped[0] ^= 1;
    expect(() =>
      decryptField(
        key,
        [version, iv, tag, flipped.toString('base64url')].join('.'),
      ),
    ).toThrow();
    expect(() => decryptField(key, 'nope')).toThrow();
  });
});

describe('cursor', () => {
  it('round-trips a payload', () => {
    const payload = { v: '2026-10-17T00:00:00.000Z', id: 'abc', n: 3, z: null };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it('returns null for garbage', () => {
    expect(decodeCursor('%%%')).toBeNull();
    expect(decodeCursor(Buffer.from('[1]').toString('base64url'))).toBeNull();
    expect(
      decodeCursor(Buffer.from('{"a":{"b":1}}').toString('base64url')),
    ).toBeNull();
  });
});

describe('dates', () => {
  it('finds the start of the Tashkent day (UTC+5)', () => {
    expect(
      startOfTashkentDay(new Date('2026-10-17T21:00:00Z')).toISOString(),
    ).toBe('2026-10-17T19:00:00.000Z');
    expect(
      startOfTashkentDay(new Date('2026-10-17T10:00:00Z')).toISOString(),
    ).toBe('2026-10-16T19:00:00.000Z');
  });

  it('subtracts days', () => {
    expect(minusDays(new Date('2026-10-17T00:00:00Z'), 7).toISOString()).toBe(
      '2026-10-10T00:00:00.000Z',
    );
  });
});

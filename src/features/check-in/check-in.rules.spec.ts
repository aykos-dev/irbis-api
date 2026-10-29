import { describe, expect, it } from 'vitest';
import {
  assertFixAtPlace,
  assertRecordedAtAllowed,
  checkInMonth,
  checkInXp,
} from './check-in.rules.js';

const CONFIG = {
  xpByDifficulty: [40, 60, 80, 100, 120],
  radiusMByType: {
    peak: 300,
    waterfall: 300,
    cave: 200,
    lake: 1000,
    canyon: 1000,
    camping: 1000,
    trail: 1000,
  },
  maxAccuracyM: 50,
  maxAgeHours: 72,
};
const NOW = new Date('2026-10-10T06:00:00Z');
const HOUR_MS = 3_600_000;
// ~0.0045° of latitude ≈ 500 m.
const PLACE = { latitude: 41.3, longitude: 69.3 };
const at500m = { lat: 41.3045, lng: 69.3, accuracyM: 10 };

describe('check-in rules (AC2, AC3)', () => {
  it('accuracy: above maxAccuracyM is LOCATION_INACCURATE, at the limit passes', () => {
    const here = { lat: 41.3, lng: 69.3 };
    expect(() =>
      assertFixAtPlace(
        { ...here, accuracyM: 51 },
        { ...PLACE, type: 'peak' },
        CONFIG,
      ),
    ).toThrow(expect.objectContaining({ code: 'LOCATION_INACCURATE' }));
    expect(() =>
      assertFixAtPlace(
        { ...here, accuracyM: 50 },
        { ...PLACE, type: 'peak' },
        CONFIG,
      ),
    ).not.toThrow();
  });

  it('radius by type: 500 m away is too far for a peak (300) with details, fine for a lake (1000)', () => {
    let error: unknown;
    try {
      assertFixAtPlace(at500m, { ...PLACE, type: 'peak' }, CONFIG);
    } catch (e) {
      error = e;
    }
    expect(error).toMatchObject({
      code: 'CHECK_IN_TOO_FAR',
      details: { distanceM: expect.any(Number), radiusM: 300 },
    });
    const { distanceM } = (error as { details: { distanceM: number } }).details;
    expect(Number.isInteger(distanceM)).toBe(true);
    expect(distanceM).toBeGreaterThan(450);
    expect(distanceM).toBeLessThan(550);
    expect(() =>
      assertFixAtPlace(at500m, { ...PLACE, type: 'lake' }, CONFIG),
    ).not.toThrow();
  });

  it('recordedAt: > now + 2 min is 400, older than 72 h is CHECK_IN_TOO_OLD, inside the window passes', () => {
    expect(() =>
      assertRecordedAtAllowed(
        new Date(NOW.getTime() + 3 * 60_000),
        NOW,
        CONFIG,
      ),
    ).toThrow(expect.objectContaining({ code: 'VALIDATION_FAILED' }));
    expect(() =>
      assertRecordedAtAllowed(new Date(NOW.getTime() + 60_000), NOW, CONFIG),
    ).not.toThrow();
    expect(() =>
      assertRecordedAtAllowed(
        new Date(NOW.getTime() - 73 * HOUR_MS),
        NOW,
        CONFIG,
      ),
    ).toThrow(expect.objectContaining({ code: 'CHECK_IN_TOO_OLD' }));
    expect(() =>
      assertRecordedAtAllowed(
        new Date(NOW.getTime() - 71 * HOUR_MS),
        NOW,
        CONFIG,
      ),
    ).not.toThrow();
  });

  it('XP table: difficulty 1..5 → 40..120; month is the Asia/Tashkent month', () => {
    expect([1, 2, 3, 4, 5].map((d) => checkInXp(d, CONFIG))).toEqual([
      40, 60, 80, 100, 120,
    ]);
    // 20:00 UTC on 31 Oct is already 1 Nov in Tashkent (UTC+5).
    expect(checkInMonth(new Date('2026-10-31T20:00:00Z'))).toBe('2026-11');
    expect(checkInMonth(new Date('2026-10-31T18:00:00Z'))).toBe('2026-10');
  });
});

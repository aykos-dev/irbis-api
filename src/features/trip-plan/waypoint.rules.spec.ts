import { assertWaypointAllowed } from './waypoint.rules.js';

const RULES = {
  xp: 10,
  minDistanceM: 500,
  minGapMin: 10,
  maxPerTrip: 5,
  maxAccuracyM: 50,
};
const T0 = new Date('2026-10-10T06:00:00Z');
const MIN_MS = 60_000;
// 0.009° of latitude ≈ 1000 m.
const at = (n: number, dLat: number, minutes: number) => ({
  n,
  lat: 41 + dLat,
  lng: 69,
  recordedAt: new Date(T0.getTime() + minutes * MIN_MS),
});
const fix = (dLat: number, minutes: number, accuracyM = 10) => ({
  ...at(0, dLat, minutes),
  accuracyM,
});
const codeOf = (fn: () => void): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return null;
};

describe('assertWaypointAllowed (AC6)', () => {
  it('accepts the first fix and one far and late enough after the others', () => {
    expect(() => assertWaypointAllowed(fix(0, 0), [], RULES)).not.toThrow();
    expect(() =>
      assertWaypointAllowed(
        fix(0.018, 30),
        [at(1, 0, 0), at(2, 0.009, 15)],
        RULES,
      ),
    ).not.toThrow();
  });

  it('checks accuracy first, then the limit', () => {
    const five = [0, 1, 2, 3, 4].map((i) => at(i + 1, i * 0.009, i * 15));
    expect(
      codeOf(() => assertWaypointAllowed(fix(1, 999, 51), five, RULES)),
    ).toMatchObject({
      code: 'LOCATION_INACCURATE',
    });
    expect(
      codeOf(() => assertWaypointAllowed(fix(1, 999), five, RULES)),
    ).toMatchObject({
      code: 'WAYPOINT_LIMIT',
    });
  });

  it('too close to ANY earlier waypoint gives remainingM rounded up', () => {
    // Near waypoint 1 (≈ 111 m away), far from the latest one.
    const err = codeOf(() =>
      assertWaypointAllowed(
        fix(0.001, 60),
        [at(1, 0, 0), at(2, 0.05, 20)],
        RULES,
      ),
    );
    expect(err).toMatchObject({ code: 'WAYPOINT_TOO_CLOSE', status: 422 });
    const { remainingM } = (err as { details: { remainingM: number } }).details;
    expect(Number.isInteger(remainingM)).toBe(true);
    expect(remainingM).toBeGreaterThan(385);
    expect(remainingM).toBeLessThan(395);
  });

  it('too soon after the previous waypoint gives remainingMin rounded up', () => {
    const err = codeOf(() =>
      assertWaypointAllowed(fix(0.018, 5.5), [at(1, 0, 0)], RULES),
    );
    expect(err).toMatchObject({
      code: 'WAYPOINT_TOO_SOON',
      details: { remainingMin: 5 },
    });
  });
});

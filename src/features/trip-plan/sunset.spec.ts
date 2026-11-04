import { sunsetAt } from './sunset.js';

describe('sunsetAt (AC3)', () => {
  it('Tashkent on 2026-10-10 sets at ~17:50 local (12:50 UTC), ±3 min', () => {
    const at = sunsetAt(41.31, 69.28, '2026-10-10');
    const expected = Date.parse('2026-10-10T12:50:00Z');
    expect(Math.abs(at.getTime() - expected)).toBeLessThanOrEqual(3 * 60_000);
  });
});

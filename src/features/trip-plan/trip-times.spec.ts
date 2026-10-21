import { assertTripTimes } from './trip-times.js';

const CONFIG = { maxDurationH: 72, planAheadDays: 14, startGraceMin: 15 };
// 2026-10-10 10:00 Asia/Tashkent.
const NOW = new Date('2026-10-10T05:00:00Z');
const at = (iso: string) => new Date(iso);

describe('assertTripTimes (AC2)', () => {
  it('accepts an overnight trip within 72 h and a start up to 15 min in the past', () => {
    expect(() =>
      assertTripTimes(
        at('2026-10-10T04:46:00Z'),
        at('2026-10-13T04:46:00Z'),
        NOW,
        CONFIG,
      ),
    ).not.toThrow();
    // Last minute of the 14th day ahead in Tashkent (2026-10-24 23:59 local).
    expect(() =>
      assertTripTimes(
        at('2026-10-24T18:59:00Z'),
        at('2026-10-24T19:30:00Z'),
        NOW,
        CONFIG,
      ),
    ).not.toThrow();
  });

  it.each([
    ['backBy equal to startAt', '2026-10-11T02:00:00Z', '2026-10-11T02:00:00Z'],
    ['longer than 72 h', '2026-10-11T02:00:00Z', '2026-10-14T02:01:00Z'],
    ['start 16 min ago', '2026-10-10T04:44:00Z', '2026-10-10T10:00:00Z'],
    ['start on day 15', '2026-10-24T19:00:00Z', '2026-10-24T20:00:00Z'],
  ])('rejects %s with TRIP_TIMES_INVALID', (_name, start, back) => {
    expect(() => assertTripTimes(at(start), at(back), NOW, CONFIG)).toThrow(
      expect.objectContaining({ code: 'TRIP_TIMES_INVALID', status: 422 }),
    );
  });
});

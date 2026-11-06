import {
  compareCandidates,
  levelRange,
  overallMean,
  pairKey,
  ratingClosesAt,
  ratingSummary,
  tashkentWeekStart,
  type CandidateSortKey,
} from './buddies.rules.js';

const at = (iso: string) => new Date(iso);
const candidate = (
  id: string,
  overrides: Partial<CandidateSortKey> = {},
): CandidateSortKey => ({
  id,
  level: 3,
  lastActiveAt: at('2026-11-01T00:00:00Z'),
  free: false,
  ratingMean: null,
  ...overrides,
});

describe('buddies rules', () => {
  it('week starts on the Asia/Tashkent Monday, even late Sunday UTC', () => {
    // Sunday 20:00 UTC is already Monday 01:00 in Tashkent.
    expect(tashkentWeekStart(at('2026-11-08T20:00:00Z')).toISOString()).toBe(
      '2026-11-09T00:00:00.000Z',
    );
    expect(tashkentWeekStart(at('2026-11-08T18:00:00Z')).toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
  });

  it('level filters: near is ±1 around mine, mentors is 5+, any is open', () => {
    expect(levelRange('near', 3)).toEqual({ min: 2, max: 4 });
    expect(levelRange('mentors', 1)).toEqual({ min: 5 });
    expect(levelRange('any', 3)).toEqual({});
  });

  it('sorts free first, then closest level, rating (hidden last), recent activity', () => {
    const rows = [
      candidate('a', { level: 3, ratingMean: null }),
      candidate('b', { level: 6, free: true }),
      candidate('c', { level: 4, ratingMean: 4.5 }),
      candidate('d', { level: 2, ratingMean: 4.8 }),
      candidate('e', { level: 3, lastActiveAt: at('2026-11-04T00:00:00Z') }),
    ];
    const order = [...rows].sort(compareCandidates(3)).map((row) => row.id);
    expect(order).toEqual(['b', 'e', 'a', 'd', 'c']);
  });

  it('ratings stay hidden below 3 distinct raters; means round to 1 decimal', () => {
    const base = { trips: 2, reliable: 4.666, safety: 4, company: 3.25 };
    expect(ratingSummary({ ...base, raters: 2 })).toBeNull();
    expect(overallMean({ ...base, raters: 2 })).toBeNull();
    expect(ratingSummary({ ...base, raters: 3 })).toEqual({
      reliable: 4.7,
      safety: 4,
      company: 3.3,
      raters: 3,
      trips: 2,
    });
    expect(overallMean({ ...base, raters: 3 })).toBe(4);
  });

  it('pair key ignores order; rating closes 7 days after backBy', () => {
    expect(pairKey('b', 'a')).toBe(pairKey('a', 'b'));
    expect(ratingClosesAt(at('2026-11-01T12:00:00Z')).toISOString()).toBe(
      '2026-11-08T12:00:00.000Z',
    );
  });
});

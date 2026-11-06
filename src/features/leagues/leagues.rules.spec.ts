import { describe, expect, it } from 'vitest';
import { FALLBACK_LEAGUE_CONFIG } from './leagues.config.js';
import { leagueSeasonAt } from './league-season.js';
import { movementFor, placementTier, rankDivision } from './leagues.rules.js';

const member = (id: string, elevationM: number, qualifyingTrips = 1) => ({
  id,
  userId: `user-${id}`,
  elevationM,
  qualifyingTrips,
  enrolledAt: new Date(
    `2026-09-${String(Number(id) + 1).padStart(2, '0')}T00:00:00.000Z`,
  ),
});

describe('seasonal league rules', () => {
  it('uses Tashkent seasonal boundaries including winter across years', () => {
    const autumn = leagueSeasonAt(
      new Date('2026-11-05T12:00:00.000Z'),
      FALLBACK_LEAGUE_CONFIG,
    );
    expect(autumn).toMatchObject({
      key: '2026-autumn',
      name: 'Autumn 2026',
      startsAt: new Date('2026-08-31T19:00:00.000Z'),
      endsAt: new Date('2026-11-30T19:00:00.000Z'),
      settlesAt: new Date('2026-12-02T19:00:00.000Z'),
    });
    const winter = leagueSeasonAt(
      new Date('2027-02-28T18:59:59.000Z'),
      FALLBACK_LEAGUE_CONFIG,
    );
    expect(winter.key).toBe('2026-winter');
    expect(winter.endsAt).toEqual(new Date('2027-02-28T19:00:00.000Z'));
  });

  it('places first-time members by the approved lifetime-XP thresholds', () => {
    expect(
      [0, 999, 1000, 2499, 2500, 4999, 5000, 8999, 9000].map((xp) =>
        placementTier(xp, FALLBACK_LEAGUE_CONFIG.xpThresholds),
      ),
    ).toEqual([
      'scout',
      'scout',
      'tracker',
      'tracker',
      'ranger',
      'ranger',
      'vanguard',
      'vanguard',
      'legend',
    ]);
  });

  it('scales movement for honest smaller divisions', () => {
    expect(
      [1, 2, 5, 6, 9, 10, 15].map((size) =>
        movementFor(size, FALLBACK_LEAGUE_CONFIG),
      ),
    ).toEqual([
      { promote: 0, demote: 0 },
      { promote: 1, demote: 1 },
      { promote: 1, demote: 1 },
      { promote: 3, demote: 2 },
      { promote: 3, demote: 2 },
      { promote: 5, demote: 3 },
      { promote: 5, demote: 3 },
    ]);
  });

  it('shares exact ranks, expands a promotion tie and protects a demotion-boundary tie', () => {
    const rows = [
      1000, 900, 800, 700, 600, 600, 500, 400, 300, 200, 100, 50, 50, 50, 0,
    ].map((elevation, index) => member(String(index + 1), elevation));
    const ranked = rankDivision(rows, 'ranger', FALLBACK_LEAGUE_CONFIG);
    expect(ranked.filter((row) => row.outcome === 'promoted')).toHaveLength(6);
    expect(ranked.filter((row) => row.outcome === 'demoted')).toHaveLength(1);
    expect(ranked[4]?.rank).toBe(5);
    expect(ranked[5]?.rank).toBe(5);
    expect(ranked[11]?.rank).toBe(12);
    expect(ranked[12]?.rank).toBe(12);
  });

  it('never demotes Scout and calls Legend promotion-zone members champions', () => {
    const rows = [member('1', 200), member('2', 100)];
    expect(
      rankDivision(rows, 'scout', FALLBACK_LEAGUE_CONFIG).map(
        (row) => row.outcome,
      ),
    ).toEqual(['promoted', 'stayed']);
    expect(
      rankDivision(rows, 'legend', FALLBACK_LEAGUE_CONFIG).map(
        (row) => row.outcome,
      ),
    ).toEqual(['champion', 'demoted']);
  });

  it('does not promote a zero-trip member even when they lead an empty division', () => {
    const ranked = rankDivision(
      [member('1', 0, 0), member('2', 0, 0)],
      'tracker',
      FALLBACK_LEAGUE_CONFIG,
    );
    expect(ranked.every((row) => row.outcome === 'stayed')).toBe(true);
  });
});

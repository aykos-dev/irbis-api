import { describe, expect, it } from 'vitest';
import type { GameConfigService } from '../levels/game-config.service.js';
import type { StreaksRepository } from './streaks.repository.js';
import type { WeekendConditionRow } from './streaks.rules.js';
import { StreaksService } from './streaks.service.js';

const MONDAY = '2026-10-19';
const SAT = '2026-10-24';
const SUN = '2026-10-25';

/** Repository faked at its interface: path places, trip places and weekend rows. */
function service(input: {
  pathPlaces?: string[];
  tripPlaces?: string[];
  rows: WeekendConditionRow[];
}) {
  const calls: { userId: string; saturday: string }[] = [];
  const repository = {
    weekendPlacesOf: (userId: string, saturday: string) => {
      calls.push({ userId, saturday });
      return Promise.resolve([
        ...new Set([...(input.pathPlaces ?? []), ...(input.tripPlaces ?? [])]),
      ]);
    },
    weekendConditions: (placeIds: string[], days: string[]) =>
      Promise.resolve(
        input.rows.filter(
          (row) => placeIds.includes(row.placeId) && days.includes(row.date),
        ),
      ),
  } as unknown as StreaksRepository;
  return {
    calls,
    svc: new StreaksService(repository, {} as GameConfigService),
  };
}

const red = (placeId: string, date: string, status = 'not_now') => ({
  placeId,
  date,
  status,
});

describe('StreaksService.isWeekShielded (AC3)', () => {
  it('all places red on Saturday and Sunday -> shielded', async () => {
    const { svc, calls } = service({
      pathPlaces: ['a', 'b'],
      rows: [
        red('a', SAT),
        red('a', SUN, 'seasonal_lock'),
        red('b', SAT, 'seasonal_lock'),
        red('b', SUN),
      ],
    });
    await expect(svc.isWeekShielded('u1', MONDAY)).resolves.toBe(true);
    expect(calls).toEqual([{ userId: 'u1', saturday: SAT }]);
  });

  it('one place go -> not shielded; no places -> not shielded', async () => {
    const goOnSunday = service({
      pathPlaces: ['a', 'b'],
      rows: [red('a', SAT), red('a', SUN), red('b', SAT), red('b', SUN, 'go')],
    });
    await expect(goOnSunday.svc.isWeekShielded('u1', MONDAY)).resolves.toBe(
      false,
    );
    const empty = service({ rows: [red('a', SAT), red('a', SUN)] });
    await expect(empty.svc.isWeekShielded('u1', MONDAY)).resolves.toBe(false);
  });

  it('missing Sunday row -> not shielded', async () => {
    const { svc } = service({ pathPlaces: ['a'], rows: [red('a', SAT)] });
    await expect(svc.isWeekShielded('u1', MONDAY)).resolves.toBe(false);
  });

  it('a trip place is included: its green weekend breaks the shield', async () => {
    const rows = [
      red('a', SAT),
      red('a', SUN),
      red('t', SAT, 'go'),
      red('t', SUN),
    ];
    const withTrip = service({ pathPlaces: ['a'], tripPlaces: ['t'], rows });
    await expect(withTrip.svc.isWeekShielded('u1', MONDAY)).resolves.toBe(
      false,
    );
    const tripOnly = service({
      tripPlaces: ['t'],
      rows: [red('t', SAT), red('t', SUN)],
    });
    await expect(tripOnly.svc.isWeekShielded('u1', MONDAY)).resolves.toBe(true);
  });
});

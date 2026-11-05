import { GroupTripInvalidError } from './trip-events.errors.js';
import { type GroupTripInput, validateGroupTrip } from './trip-events.rules.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// 10:00 Asia/Tashkent.
const NOW = new Date('2026-11-05T05:00:00Z');

const input = (overrides: Partial<GroupTripInput> = {}): GroupTripInput => ({
  visibility: 'public',
  startAt: new Date(NOW.getTime() + DAY_MS).toISOString(),
  backBy: new Date(NOW.getTime() + DAY_MS + 6 * HOUR_MS).toISOString(),
  meetingText: '  Metro Buyuk Ipak Yoli exit 2  ',
  ...overrides,
});

const fieldErrors = (value: GroupTripInput): Record<string, string[]> => {
  try {
    validateGroupTrip(value, NOW, 12);
  } catch (error) {
    if (error instanceof GroupTripInvalidError) return error.fieldErrors;
    throw error;
  }
  return {};
};

describe('validateGroupTrip (AC1)', () => {
  it('accepts a valid trip, trimming text and deduping custom gear', () => {
    const fields = validateGroupTrip(
      input({
        customGear: [' poles ', 'poles', 'gloves'],
        gearKeys: ['water'],
      }),
      NOW,
      12,
    );
    expect(fields.meetingText).toBe('Metro Buyuk Ipak Yoli exit 2');
    expect(fields.customGear).toEqual(['poles', 'gloves']);
    expect(fields.carpoolFrom).toBeNull();
  });

  it('allows the 60th Tashkent day ahead and rejects the 61st', () => {
    const day60 = new Date(NOW.getTime() + 60 * DAY_MS);
    const ok = input({
      startAt: day60.toISOString(),
      backBy: new Date(day60.getTime() + HOUR_MS).toISOString(),
    });
    expect(fieldErrors(ok)).toEqual({});
    const day61 = new Date(NOW.getTime() + 61 * DAY_MS);
    const late = input({
      startAt: day61.toISOString(),
      backBy: new Date(day61.getTime() + HOUR_MS).toISOString(),
    });
    expect(fieldErrors(late)).toEqual({ startAt: ['tooFarAhead'] });
  });

  it('lists every bad field: duration, pairs, ranges and gear', () => {
    const start = NOW.getTime() + DAY_MS;
    expect(
      fieldErrors(
        input({
          visibility: 'friends',
          backBy: new Date(start + 13 * HOUR_MS).toISOString(),
          meetingText: '   ',
          meetingLat: 41.3,
          carpoolFrom: '25:00',
          carpoolSeats: 9,
          maxPeople: 1,
          minLevel: 8,
          gearKeys: ['jetpack'],
          customGear: ['x'.repeat(31)],
        }),
      ),
    ).toEqual({
      visibility: ['isEnum'],
      backBy: ['tooLong'],
      meetingText: ['length'],
      meeting: ['latLngTogether'],
      carpoolFrom: ['timeOfDay'],
      carpoolSeats: ['range'],
      maxPeople: ['range'],
      minLevel: ['range'],
      gearKeys: ['unknownKey'],
      customGear: ['itemLength'],
    });
  });
});

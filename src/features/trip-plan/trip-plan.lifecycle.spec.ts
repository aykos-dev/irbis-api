import type { PhoneCipher } from '../auth/phone-cipher.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import type {
  TripChange,
  TripPlanRepository,
  TripRecord,
} from './trip-plan.repository.js';
import { TripPlanService } from './trip-plan.service.js';

const HOUR_MS = 3_600_000;
const NOW = new Date('2026-10-10T06:00:00Z');
const START = new Date('2026-10-10T03:00:00Z');

const trip = (over: Partial<TripRecord>): TripRecord => ({
  id: 'trip_1',
  status: 'active',
  startAt: START,
  backBy: new Date(START.getTime() + 6 * HOUR_MS),
  alertEnabled: true,
  contactName: 'guest_2',
  contactRelation: 'friend',
  contactPhoneLast2: '41',
  startedAt: START,
  checkedOutAt: null,
  alertSentAt: null,
  place: {
    id: 'place_1',
    slug: 'p',
    nameUz: 'p',
    nameRu: null,
    nameEn: null,
    type: 'lake',
    latitude: 41,
    longitude: 69,
  },
  ...over,
});

function service(record: TripRecord) {
  const changes: TripChange[] = [];
  const repo = {
    findOwnTrip: () => Promise.resolve(record),
    updateIf: (_id: string, _guard: unknown, change: TripChange) => {
      changes.push(change);
      return Promise.resolve({ ...record, ...change });
    },
  };
  const svc = new TripPlanService(
    repo as unknown as TripPlanRepository,
    {
      tripConfig: () =>
        Promise.resolve({
          alertDelayMin: 60,
          maxDurationH: 12,
          planAheadDays: 14,
          startGraceMin: 15,
        }),
    } as unknown as GameConfigService,
    {} as PhoneCipher,
  );
  return { svc, changes };
}

const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe('TripPlanService.update on an active trip (AC7)', () => {
  it('extends backBy within startAt + maxDurationH, rejects past or too-long backBy and any startAt', async () => {
    const { svc, changes } = service(trip({}));
    const ok = await svc.update(
      'user_1',
      'trip_1',
      { backBy: iso(HOUR_MS) },
      NOW,
    );
    expect(ok.backBy.toISOString()).toBe(iso(HOUR_MS));

    await expect(
      svc.update('user_1', 'trip_1', { backBy: iso(-1) }, NOW),
    ).rejects.toMatchObject({ code: 'TRIP_TIMES_INVALID', status: 422 });
    await expect(
      svc.update('user_1', 'trip_1', { backBy: iso(10 * HOUR_MS) }, NOW),
    ).rejects.toMatchObject({ code: 'TRIP_TIMES_INVALID' });
    await expect(
      svc.update('user_1', 'trip_1', { startAt: iso(HOUR_MS) }, NOW),
    ).rejects.toMatchObject({ code: 'TRIP_NOT_EDITABLE', status: 409 });
    expect(changes).toHaveLength(1);
  });

  it('is not editable once the alert is sent, alerted or checked out', async () => {
    for (const record of [
      trip({ alertSentAt: NOW }),
      trip({ status: 'alerted', alertSentAt: NOW }),
      trip({ status: 'checked_out' }),
    ]) {
      const { svc } = service(record);
      await expect(
        svc.update('user_1', 'trip_1', { alertEnabled: false }, NOW),
      ).rejects.toMatchObject({ code: 'TRIP_NOT_EDITABLE' });
    }
  });
});

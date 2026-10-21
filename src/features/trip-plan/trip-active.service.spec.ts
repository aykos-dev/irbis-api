import type { AppConfig } from '../../config/app-config.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import { TripActiveService, liveStatus } from './trip-active.service.js';
import type {
  LiveTripRecord,
  TripPing,
  TripPlanRepository,
  TripRow,
} from './trip-plan.repository.js';

const MIN_MS = 60_000;
const HOUR_MS = 60 * MIN_MS;
const NOW = new Date('2026-10-10T06:00:00Z');
const STARTED = new Date(NOW.getTime() - 2 * HOUR_MS);
const TOKEN = 'A'.repeat(22);

const ACTIVE = { pingEveryMin: 5, liveAfterCheckoutH: 2 };

function setup(trip: Partial<TripRow> | null, live?: LiveTripRecord) {
  const pings: TripPing[] = [];
  const repo = {
    findOwnTrip: () =>
      Promise.resolve(
        trip && {
          status: 'active',
          startedAt: STARTED,
          lastLocationAt: null,
          ...trip,
        },
      ),
    recordPing: (_id: string, _s: unknown, ping: TripPing) => {
      pings.push(ping);
      return Promise.resolve(true);
    },
    findLiveTrip: () => Promise.resolve(live ?? null),
  };
  const svc = new TripActiveService(
    repo as unknown as TripPlanRepository,
    {
      tripActiveConfig: () => Promise.resolve(ACTIVE),
    } as unknown as GameConfigService,
    { webPublicUrl: 'http://web.test' } as AppConfig,
  );
  return { svc, pings };
}

const ping = (recordedAt: Date) => ({
  lat: 41.5,
  lng: 69.5,
  accuracyM: 12,
  recordedAt: recordedAt.toISOString(),
  distanceM: 1200,
  climbM: 80,
});

describe('TripActiveService.postLocation (AC3)', () => {
  it('stores a newer fix and ignores one older than the stored lastLocationAt', async () => {
    const last = new Date(NOW.getTime() - 10 * MIN_MS);
    const { svc, pings } = setup({ lastLocationAt: last });
    await svc.postLocation(
      'user_1',
      'trip_1',
      ping(new Date(last.getTime() - 1)),
      NOW,
    );
    expect(pings).toHaveLength(0);
    await svc.postLocation('user_1', 'trip_1', ping(NOW), NOW);
    expect(pings).toEqual([
      expect.objectContaining({ recordedAt: NOW, distanceM: 1200, climbM: 80 }),
    ]);
  });

  it('rejects a checked-out trip with 409 TRIP_NOT_ACTIVE and a far-future fix with 400', async () => {
    await expect(
      setup({ status: 'checked_out' }).svc.postLocation(
        'user_1',
        'trip_1',
        ping(NOW),
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'TRIP_NOT_ACTIVE', status: 409 });
    await expect(
      setup({}).svc.postLocation(
        'user_1',
        'trip_1',
        ping(new Date(NOW.getTime() + 3 * MIN_MS)),
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('live status (AC5)', () => {
  const backBy = new Date(NOW.getTime() + HOUR_MS);
  it('on_trip before backBy, late after, back_safe for 2 h after check-out, then ended', () => {
    const active = { status: 'active' as const, backBy, checkedOutAt: null };
    expect(liveStatus(active, NOW, 2)).toBe('on_trip');
    expect(liveStatus(active, new Date(backBy.getTime() + 1), 2)).toBe('late');
    const out = { status: 'checked_out' as const, backBy, checkedOutAt: NOW };
    expect(liveStatus(out, new Date(NOW.getTime() + HOUR_MS), 2)).toBe(
      'back_safe',
    );
    expect(liveStatus(out, new Date(NOW.getTime() + 2 * HOUR_MS), 2)).toBe(
      'ended',
    );
  });

  it('ended hides location; planned is LIVE_NOT_FOUND', async () => {
    const record: LiveTripRecord = {
      status: 'checked_out',
      backBy,
      checkedOutAt: new Date(NOW.getTime() - 3 * HOUR_MS),
      lastLat: 41.5,
      lastLng: 69.5,
      lastLocationAt: NOW,
      user: { username: 'guest_1', displayName: null },
      place: { nameUz: 'Chorvoq', nameRu: null, nameEn: null },
    };
    const ended = await setup(null, record).svc.live(TOKEN, NOW);
    expect(ended).toEqual({
      displayName: 'guest_1',
      placeNames: { uz: 'Chorvoq', ru: 'Chorvoq', en: 'Chorvoq' },
      backBy,
      status: 'ended',
    });
    await expect(
      setup(null, { ...record, status: 'planned' }).svc.live(TOKEN, NOW),
    ).rejects.toMatchObject({ code: 'LIVE_NOT_FOUND', status: 404 });
  });
});

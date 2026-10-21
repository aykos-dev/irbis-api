import type { PhoneCipher } from '../auth/phone-cipher.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import type {
  NewTrip,
  TripChange,
  TripPlanRepository,
  TripRow,
} from './trip-plan.repository.js';
import { TripPlanService } from './trip-plan.service.js';

const HOUR_MS = 3_600_000;
const NOW = new Date('2026-10-10T06:00:00Z');
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

const row = (over: Partial<TripRow> = {}): TripRow => ({
  id: 'trip_1',
  status: 'planned',
  startAt: new Date(NOW.getTime() + HOUR_MS),
  backBy: new Date(NOW.getTime() + 6 * HOUR_MS),
  alertEnabled: true,
  contactName: 'guest_2',
  contactRelation: 'friend',
  contactPhoneLast2: '41',
  startedAt: null,
  checkedOutAt: null,
  alertSentAt: null,
  liveToken: null,
  lastLocationAt: null,
  distanceM: 0,
  climbM: 0,
  waypoints: [],
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

function service(repo: Partial<Record<keyof TripPlanRepository, unknown>>) {
  return new TripPlanService(
    repo as unknown as TripPlanRepository,
    {
      tripConfig: () =>
        Promise.resolve({
          alertDelayMin: 60,
          maxDurationH: 72,
          planAheadDays: 14,
          startGraceMin: 15,
        }),
    } as unknown as GameConfigService,
    {} as PhoneCipher,
  );
}

describe('live token (active-trip AC4)', () => {
  it('start and create-with-start give the trip a fresh 22-char token', async () => {
    const changes: TripChange[] = [];
    const created: NewTrip[] = [];
    const svc = service({
      findOwnTrip: () => Promise.resolve(row()),
      hasActiveTrip: () => Promise.resolve(false),
      updateIf: (_id: string, _g: unknown, change: TripChange) => {
        changes.push(change);
        return Promise.resolve(row({ ...change }));
      },
      placeExists: () => Promise.resolve(true),
      findContact: () =>
        Promise.resolve({
          name: 'guest_2',
          relation: 'friend',
          phone: 'ciphertext',
          phoneLast2: '41',
        }),
      createTrip: (t: NewTrip) => {
        created.push(t);
        return Promise.resolve(row({ status: 'active' }));
      },
    });

    const started = await svc.start('user_1', 'trip_1', {}, NOW);
    expect(changes[0]?.liveToken).toMatch(TOKEN);
    expect(started.liveToken).toBe(changes[0]?.liveToken);

    await svc.create(
      'user_1',
      {
        placeId: 'place_1',
        startAt: NOW.toISOString(),
        backBy: new Date(NOW.getTime() + HOUR_MS).toISOString(),
        alertEnabled: true,
        start: true,
      },
      NOW,
    );
    expect(created[0]?.liveToken).toMatch(TOKEN);
  });

  it('current back-fills a token for an active trip without one, and leaves an existing one', async () => {
    const backfilled: string[] = [];
    const svc = (active: TripRow) =>
      service({
        findActiveTrip: () => Promise.resolve(active),
        listPlannedTrips: () => Promise.resolve([]),
        backfillLiveToken: (_id: string, token: string) => {
          backfilled.push(token);
          return Promise.resolve(token);
        },
      });

    const fresh = await svc(row({ status: 'active' })).current('user_1', NOW);
    expect(backfilled).toHaveLength(1);
    expect(fresh.active?.liveToken).toMatch(TOKEN);

    const kept = await svc(
      row({ status: 'active', liveToken: 'B'.repeat(22) }),
    ).current('user_1', NOW);
    expect(backfilled).toHaveLength(1);
    expect(kept.active?.liveToken).toBe('B'.repeat(22));
  });
});

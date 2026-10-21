import type { AppConfig } from '../../config/app-config.js';
import type { PhoneCipher } from '../auth/phone-cipher.js';
import type { SmsSender, SmsTextMessage } from '../auth/sms-sender.js';
import type { GameConfigService } from '../levels/game-config.service.js';
import type { AwardInput, LevelsService } from '../levels/levels.service.js';
import type {
  NewSos,
  NewWaypoint,
  SafetyTripRecord,
  TripPlanRepository,
  TripWaypointRecord,
} from './trip-plan.repository.js';
import { TripSafetyService } from './trip-safety.service.js';

const NOW = new Date('2026-10-10T06:00:00Z');
const STARTED = new Date(NOW.getTime() - 3_600_000);
const ACTIVE = {
  pingEveryMin: 5,
  waypoint: {
    xp: 10,
    minDistanceM: 500,
    minGapMin: 10,
    maxPerTrip: 5,
    maxAccuracyM: 50,
  },
  sosCooldownSec: 60,
  liveAfterCheckoutH: 2,
};

const TRIP: SafetyTripRecord = {
  id: 'trip_1',
  status: 'active',
  startedAt: STARTED,
  contactName: 'guest_2',
  contactPhone: 'cipher',
  startLat: 41.1,
  startLng: 69.1,
  lastLat: null,
  lastLng: null,
  liveToken: 'A'.repeat(22),
  user: { username: 'guest_1', locale: 'en' },
  place: {
    nameUz: 'lake-uz',
    nameRu: null,
    nameEn: 'Lake',
    latitude: 41.3,
    longitude: 69.3,
  },
};

function setup(opts: {
  trip?: Partial<SafetyTripRecord>;
  waypoints?: TripWaypointRecord[];
  collideOnce?: boolean;
  lastSosAt?: Date | null;
  awarded?: number | null;
  smsFails?: boolean;
}) {
  const waypoints = [...(opts.waypoints ?? [])];
  const inserted: NewWaypoint[] = [];
  const sos: NewSos[] = [];
  const texts: SmsTextMessage[] = [];
  const awards: AwardInput[] = [];
  let collide = opts.collideOnce ?? false;
  const repo = {
    findSafetyTrip: () => Promise.resolve({ ...TRIP, ...opts.trip }),
    listWaypoints: () => Promise.resolve([...waypoints]),
    insertWaypoint: (w: NewWaypoint) => {
      if (collide) {
        // Another tap took n first, far enough away but just now.
        collide = false;
        waypoints.push({ n: w.n, lat: 40, lng: 68, recordedAt: w.recordedAt });
        return Promise.resolve(null);
      }
      inserted.push(w);
      return Promise.resolve({ id: `wp_${w.n}` });
    },
    setWaypointXp: () => Promise.resolve(),
    lastSosAt: () => Promise.resolve(opts.lastSosAt ?? null),
    insertSos: (row: NewSos) => {
      sos.push(row);
      return Promise.resolve();
    },
  };
  const levels = {
    award: (input: AwardInput) => {
      awards.push(input);
      const amount = opts.awarded === undefined ? input.amount : opts.awarded;
      return Promise.resolve({
        entry: amount === null ? null : { amount },
        created: true,
        capped: amount !== input.amount,
        levelUps: [],
      });
    },
  };
  const sms = {
    sendText: (m: SmsTextMessage) => {
      texts.push(m);
      return opts.smsFails
        ? Promise.reject(new Error('provider down'))
        : Promise.resolve();
    },
  };
  const svc = new TripSafetyService(
    repo as unknown as TripPlanRepository,
    {
      tripActiveConfig: () => Promise.resolve(ACTIVE),
    } as unknown as GameConfigService,
    levels as unknown as LevelsService,
    { decrypt: () => '+998XXXXXXXXX' } as unknown as PhoneCipher,
    sms as unknown as SmsSender,
    {
      webPublicUrl: 'http://web.test',
      sosCallNumber: undefined,
    } as unknown as AppConfig,
  );
  return { svc, inserted, sos, texts, awards };
}

const checkIn = (minutesAgo = 1, accuracyM = 10) => ({
  lat: 41.5,
  lng: 69.5,
  accuracyM,
  recordedAt: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
});

describe('TripSafetyService.checkInWaypoint (AC6)', () => {
  it('inserts n = count + 1 and awards waypoint XP with the waypoint id as refId', async () => {
    const { svc, inserted, awards } = setup({
      waypoints: [{ n: 1, lat: 41, lng: 69, recordedAt: STARTED }],
    });
    const res = await svc.checkInWaypoint('user_1', 'trip_1', checkIn(), NOW);
    expect(inserted).toEqual([expect.objectContaining({ n: 2 })]);
    expect(awards).toEqual([
      { userId: 'user_1', source: 'waypoint', refId: 'wp_2', amount: 10 },
    ]);
    expect(res).toMatchObject({ waypoint: { n: 2 }, xpAwarded: 10 });
  });

  it('reports what the capped award granted (0 when the cap is used up)', async () => {
    const { svc } = setup({ awarded: null });
    const res = await svc.checkInWaypoint('user_1', 'trip_1', checkIn(), NOW);
    expect(res.xpAwarded).toBe(0);
  });

  it('re-checks the rules after losing the race for n (second fast tap is too soon)', async () => {
    const { svc, inserted } = setup({ collideOnce: true });
    await expect(
      svc.checkInWaypoint('user_1', 'trip_1', checkIn(), NOW),
    ).rejects.toMatchObject({ code: 'WAYPOINT_TOO_SOON' });
    expect(inserted).toHaveLength(0);
  });

  it('409 TRIP_NOT_ACTIVE for a checked-out trip', async () => {
    const { svc } = setup({ trip: { status: 'checked_out' } });
    await expect(
      svc.checkInWaypoint('user_1', 'trip_1', checkIn(), NOW),
    ).rejects.toMatchObject({ code: 'TRIP_NOT_ACTIVE' });
  });
});

describe('TripSafetyService.sendSos (AC7)', () => {
  it('texts the contact with the body fix, live link and username; stores sent', async () => {
    const { svc, texts, sos } = setup({});
    const res = await svc.sendSos(
      'user_1',
      'trip_1',
      { lat: 41.123456, lng: 69.654321 },
      NOW,
    );
    expect(texts).toHaveLength(1);
    expect(texts[0]?.text).toBe(
      `SOS from guest_1 near Lake. Location: https://maps.google.com/?q=41.12346,69.65432. Live: http://web.test/t/${'A'.repeat(22)} — Irbis`,
    );
    expect(sos).toEqual([
      expect.objectContaining({ status: 'sent', lat: 41.123456 }),
    ]);
    expect(res).toEqual({
      sentAt: NOW,
      contactName: 'guest_2',
      sosCallNumber: null,
    });
  });

  it('falls back to the last ping, then the start fix, then the place', async () => {
    const ping = setup({ trip: { lastLat: 41.2, lastLng: 69.2 } });
    await ping.svc.sendSos('user_1', 'trip_1', {}, NOW);
    expect(ping.sos[0]).toMatchObject({ lat: 41.2, lng: 69.2 });
    const start = setup({});
    await start.svc.sendSos('user_1', 'trip_1', {}, NOW);
    expect(start.sos[0]).toMatchObject({ lat: 41.1, lng: 69.1 });
    const place = setup({ trip: { startLat: null, startLng: null } });
    await place.svc.sendSos('user_1', 'trip_1', {}, NOW);
    expect(place.sos[0]).toMatchObject({ lat: 41.3, lng: 69.3 });
  });

  it('429 SOS_TOO_SOON with retryInSec inside the cooldown', async () => {
    const { svc, texts } = setup({
      lastSosAt: new Date(NOW.getTime() - 20_500),
    });
    await expect(
      svc.sendSos('user_1', 'trip_1', {}, NOW),
    ).rejects.toMatchObject({
      code: 'SOS_TOO_SOON',
      status: 429,
      details: { retryInSec: 40 },
    });
    expect(texts).toHaveLength(0);
  });

  it('a failed send stores a failed row and answers 502 SOS_SEND_FAILED', async () => {
    const { svc, sos } = setup({ smsFails: true });
    await expect(
      svc.sendSos('user_1', 'trip_1', {}, NOW),
    ).rejects.toMatchObject({ code: 'SOS_SEND_FAILED', status: 502 });
    expect(sos).toEqual([expect.objectContaining({ status: 'failed' })]);
  });
});

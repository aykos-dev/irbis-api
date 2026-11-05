import type { GameConfigService } from '../levels/game-config.service.js';
import type { TripPlanService } from '../trip-plan/trip-plan.service.js';
import type {
  GroupTripRow,
  TripEventsRepository,
  TripNotice,
} from './trip-events.repository.js';
import {
  isEditLocked,
  mergeGroupTripPatch,
  tashkentDayRange,
} from './trip-events.rules.js';
import { TripEventsService } from './trip-events.service.js';

// 10:00 Asia/Tashkent on 5 Nov.
const NOW = new Date('2026-11-05T05:00:00Z');
const LEADER = '00000000-0000-7000-8000-000000000001';
const JOINER = '00000000-0000-7000-8000-000000000002';
const PLACE = '00000000-0000-7000-8000-000000000020';

const person = (id: string) => ({
  id,
  username: `guest_${id.slice(-1)}`,
  displayName: null,
  level: 3,
});

const trip = (overrides: Partial<GroupTripRow> = {}): GroupTripRow => ({
  id: '00000000-0000-7000-8000-000000000030',
  creatorId: LEADER,
  visibility: 'public',
  status: 'open',
  startAt: new Date('2026-11-07T01:00:00Z'),
  backBy: new Date('2026-11-07T09:00:00Z'),
  meetingText: 'Metro exit 2',
  meetingLat: 41.3,
  meetingLng: 69.2,
  carpoolFrom: null,
  carpoolSeats: null,
  maxPeople: 6,
  minLevel: null,
  gearKeys: [],
  customGear: [],
  description: '',
  place: {
    id: PLACE,
    slug: 'chimgan',
    nameUz: 'Chimyon',
    nameRu: null,
    nameEn: 'Chimgan',
    type: 'peak',
    difficulty: 2,
    requiredLevel: 1,
  },
  creator: person(LEADER),
  groups: [],
  members: [
    {
      userId: LEADER,
      role: 'leader',
      status: 'approved',
      note: null,
      createdAt: NOW,
      user: person(LEADER),
    },
    {
      userId: JOINER,
      role: 'member',
      status: 'approved',
      note: null,
      createdAt: NOW,
      user: person(JOINER),
    },
  ],
  ...overrides,
});

function setup(row: GroupTripRow = trip()) {
  const updates: TripNotice[][] = [];
  const left: string[] = [];
  const repository = {
    find: () => Promise.resolve(row),
    ledGroupIds: () => Promise.resolve([]),
    placeExists: () => Promise.resolve(true),
    update: (
      _id: string,
      _p: string,
      _f: unknown,
      _g: unknown,
      n: TripNotice[],
    ) => {
      updates.push(n);
      return Promise.resolve([]);
    },
    leave: (_id: string, userId: string) => {
      left.push(userId);
      return Promise.resolve();
    },
  } as unknown as TripEventsRepository;
  const gameConfig = {
    tripConfig: () => Promise.resolve({ maxDurationH: 12 }),
  } as unknown as GameConfigService;
  return {
    service: new TripEventsService(
      repository,
      gameConfig,
      {} as TripPlanService,
    ),
    updates,
    left,
  };
}

describe('trip-events AC5 rules', () => {
  it('a patch keeps undefined fields and clears null ones', () => {
    const merged = mergeGroupTripPatch(trip(), {
      meetingText: 'Bus stop',
      meetingLat: null,
      meetingLng: null,
    });
    expect(merged).toMatchObject({
      meetingText: 'Bus stop',
      maxPeople: 6,
      startAt: '2026-11-07T01:00:00.000Z',
    });
    expect(merged.meetingLat).toBeUndefined();
    expect(merged.meetingLng).toBeUndefined();
  });

  it('locks at 00:00 Asia/Tashkent on the start day', () => {
    const startAt = new Date('2026-11-07T01:00:00Z'); // 06:00 Tashkent
    expect(isEditLocked(startAt, new Date('2026-11-06T18:59:00Z'))).toBe(false);
    expect(isEditLocked(startAt, new Date('2026-11-06T19:00:00Z'))).toBe(true);
    expect(tashkentDayRange(startAt).from.toISOString()).toBe(
      '2026-11-06T19:00:00.000Z',
    );
  });
});

describe('TripEventsService AC5', () => {
  it('edit: 409 locked on the start day, 409 closed when cancelled, 403 for a member', async () => {
    const today = setup(trip({ startAt: new Date('2026-11-05T08:00:00Z') }));
    await expect(
      today.service.update(LEADER, 'x', {}, NOW),
    ).rejects.toMatchObject({ code: 'GROUP_TRIP_LOCKED' });
    const cancelled = setup(trip({ status: 'cancelled' }));
    await expect(
      cancelled.service.update(LEADER, 'x', {}, NOW),
    ).rejects.toMatchObject({ code: 'GROUP_TRIP_CLOSED' });
    await expect(
      setup().service.update(JOINER, 'x', {}, NOW),
    ).rejects.toMatchObject({ code: 'TRIP_LEADER_REQUIRED' });
  });

  it('edit notifies everyone on the trip but the leader with trip_changed', async () => {
    const ctx = setup();
    await ctx.service.update(LEADER, 'x', { meetingText: 'Bus stop' }, NOW);
    expect(ctx.updates[0]).toEqual([
      expect.objectContaining({ userId: JOINER, kind: 'trip_changed' }),
    ]);
  });

  it('leave: the leader gets 409, a member leaves', async () => {
    const ctx = setup();
    await expect(ctx.service.leave(LEADER, 'x', NOW)).rejects.toMatchObject({
      code: 'LEADER_CANNOT_LEAVE',
    });
    await ctx.service.leave(JOINER, 'x', NOW);
    expect(ctx.left).toEqual([JOINER]);
  });
});

import type { GameConfigService } from '../levels/game-config.service.js';
import type { TripPlanService } from '../trip-plan/trip-plan.service.js';
import type {
  CallerRow,
  GroupTripMemberRow,
  GroupTripRow,
  TripEventsRepository,
  TripNotice,
} from './trip-events.repository.js';
import { TripEventsService } from './trip-events.service.js';

const NOW = new Date('2026-11-05T05:00:00Z');
const LEADER = '00000000-0000-7000-8000-000000000001';
const JOINER = '00000000-0000-7000-8000-000000000002';
const GROUP = '00000000-0000-7000-8000-000000000010';
const PLACE = '00000000-0000-7000-8000-000000000020';

const user = (id: string, level = 3) => ({
  id,
  username: `guest_${id.slice(-1)}`,
  displayName: null,
  level,
});

const member = (
  userId: string,
  role: 'leader' | 'member',
  status: 'pending' | 'approved',
): GroupTripMemberRow => ({
  userId,
  role,
  status,
  note: null,
  createdAt: NOW,
  user: user(userId),
});

const trip = (overrides: Partial<GroupTripRow> = {}): GroupTripRow => ({
  id: '00000000-0000-7000-8000-000000000030',
  creatorId: LEADER,
  visibility: 'public',
  status: 'open',
  startAt: new Date(NOW.getTime() + 86_400_000),
  backBy: new Date(NOW.getTime() + 90_000_000),
  meetingText: 'Metro exit 2',
  meetingLat: null,
  meetingLng: null,
  carpoolFrom: null,
  carpoolSeats: null,
  maxPeople: null,
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
  creator: user(LEADER, 5),
  groups: [],
  members: [member(LEADER, 'leader', 'approved')],
  ...overrides,
});

function setup(
  row: GroupTripRow = trip(),
  caller: Partial<CallerRow> = {},
  options: { ledGroups?: string[]; hasContact?: boolean } = {},
) {
  const notices: TripNotice[] = [];
  const contactsSaved: string[] = [];
  let created = 0;
  const repository = {
    findCaller: (id: string) =>
      Promise.resolve({ ...user(id), isDemo: false, ...caller }),
    ledGroupIds: () => Promise.resolve(options.ledGroups ?? [GROUP]),
    placeExists: () => Promise.resolve(true),
    hasContact: () => Promise.resolve(options.hasContact ?? true),
    create: () => {
      created += 1;
      return Promise.resolve(row.id);
    },
    find: () => Promise.resolve(row),
    canSeePrivate: () => Promise.resolve(false),
    request: (_t: string, _u: string, _n: string | null, n: TripNotice) => {
      notices.push(n);
      return Promise.resolve();
    },
  } as unknown as TripEventsRepository;
  const gameConfig = {
    tripConfig: () => Promise.resolve({ maxDurationH: 12 }),
  } as unknown as GameConfigService;
  const tripPlan = {
    putEmergencyContact: (userId: string) => {
      contactsSaved.push(userId);
      return Promise.resolve();
    },
  } as unknown as TripPlanService;
  return {
    service: new TripEventsService(repository, gameConfig, tripPlan),
    notices,
    contactsSaved,
    created: () => created,
  };
}

const createDto = (groupIds: string[]) => ({
  placeId: PLACE,
  groupIds,
  visibility: 'public',
  startAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
  backBy: new Date(NOW.getTime() + 90_000_000).toISOString(),
  meetingText: 'Metro exit 2',
});

describe('TripEventsService', () => {
  it('AC1: needs owner/admin of a group and of every linked group', async () => {
    const none = setup(trip(), {}, { ledGroups: [] });
    await expect(
      none.service.create(LEADER, createDto([]), NOW),
    ).rejects.toMatchObject({ code: 'TRIP_LEADER_REQUIRED' });
    const foreign = setup();
    await expect(
      foreign.service.create(LEADER, createDto([GROUP, PLACE]), NOW),
    ).rejects.toMatchObject({ code: 'GROUP_LINK_FORBIDDEN' });
    expect(foreign.created()).toBe(0);
  });

  it('AC2: a private trip is 404 to outsiders; requests show to the leader only', async () => {
    const hidden = setup(trip({ visibility: 'private' }));
    await expect(hidden.service.details('x', JOINER)).rejects.toMatchObject({
      code: 'GROUP_TRIP_NOT_FOUND',
    });
    const row = trip({
      maxPeople: 4,
      members: [
        member(LEADER, 'leader', 'approved'),
        member(JOINER, 'member', 'pending'),
      ],
    });
    const { service } = setup(row);
    const leaderView = await service.details(row.id, LEADER);
    expect(leaderView).toMatchObject({
      approvedCount: 1,
      spotsLeft: 3,
      me: { role: 'leader', status: 'approved' },
      leader: { verifiedLeader: true },
      place: { names: { uz: 'Chimyon', ru: 'Chimyon', en: 'Chimgan' } },
    });
    expect(leaderView.requests.map((r) => r.userId)).toEqual([JOINER]);
    expect((await service.details(row.id, JOINER)).requests).toEqual([]);
  });

  it('AC3: demo 403, full 409, repeat 409; otherwise saves the sent contact and notifies the leader', async () => {
    const demo = setup(trip(), { isDemo: true });
    await expect(
      demo.service.request(JOINER, 'x', {}, NOW),
    ).rejects.toMatchObject({ code: 'SECURED_ACCOUNT_REQUIRED' });

    const full = setup(
      trip({
        maxPeople: 2,
        members: [
          member(LEADER, 'leader', 'approved'),
          member('00000000-0000-7000-8000-000000000003', 'member', 'approved'),
        ],
      }),
    );
    await expect(
      full.service.request(JOINER, 'x', {}, NOW),
    ).rejects.toMatchObject({ code: 'GROUP_TRIP_FULL' });

    const again = setup(
      trip({ members: [member(JOINER, 'member', 'pending')] }),
    );
    await expect(
      again.service.request(JOINER, 'x', {}, NOW),
    ).rejects.toMatchObject({ code: 'ALREADY_REQUESTED' });

    const noContact = setup(trip(), {}, { hasContact: false });
    await expect(
      noContact.service.request(JOINER, 'x', {}, NOW),
    ).rejects.toMatchObject({ code: 'EMERGENCY_CONTACT_REQUIRED' });

    const ok = setup(trip(), {}, { hasContact: false });
    const contact = {
      name: 'guest_2',
      relation: 'friend',
      phone: '+998900000041',
    };
    await ok.service.request(JOINER, 'x', { contact }, NOW);
    expect(ok.contactsSaved).toEqual([JOINER]);
    expect(ok.notices).toEqual([
      expect.objectContaining({
        userId: LEADER,
        kind: 'trip_request',
        data: { groupTripId: trip().id, userId: JOINER },
      }),
    ]);
  });
});

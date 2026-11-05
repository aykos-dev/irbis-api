import type { StorageService } from '../../lib/storage/storage.service.js';
import type {
  BuddiesRepository,
  BuddyNotice,
  BuddyUserRow,
  LinkRow,
  RatingTripRow,
} from './buddies.repository.js';
import { BuddiesService } from './buddies.service.js';

const NOW = new Date('2026-11-05T05:00:00Z');
const ME = '00000000-0000-7000-8000-000000000001';
const THEM = '00000000-0000-7000-8000-000000000002';
const OTHER = '00000000-0000-7000-8000-000000000003';
const TRIP = '00000000-0000-7000-8000-000000000030';

const user = (id: string): BuddyUserRow => ({
  id,
  username: `guest_${id.slice(-1)}`,
  displayName: null,
  avatarKey: null,
  level: 3,
});

const link = (overrides: Partial<LinkRow> = {}): LinkRow => ({
  id: '00000000-0000-7000-8000-000000000040',
  requesterId: THEM,
  addresseeId: ME,
  status: 'pending',
  createdAt: NOW,
  requester: user(THEM),
  addressee: user(ME),
  ...overrides,
});

const ratingTrip = (backBy: Date, attendees: string[]): RatingTripRow => ({
  id: TRIP,
  startAt: new Date(backBy.getTime() - 3_600_000),
  backBy,
  place: { nameUz: 'Chimyon', nameRu: null, nameEn: 'Chimgan' },
  members: attendees.map((id) => ({ user: user(id) })),
});

function setup(
  options: {
    isDemo?: boolean;
    existing?: LinkRow | null;
    trip?: RatingTripRow | null;
  } = {},
) {
  const notices: BuddyNotice[] = [];
  const ratings: string[] = [];
  let created = 0;
  const repository = {
    findCaller: (id: string) =>
      Promise.resolve({
        ...user(id),
        isDemo: options.isDemo ?? false,
      }),
    findTarget: (id: string) =>
      Promise.resolve({ id, isDemo: false, deletedAt: null, blockedAt: null }),
    findLinkByPair: () => Promise.resolve(options.existing ?? null),
    createLink: (_r: string, _a: string, _k: string, notice: BuddyNotice) => {
      created += 1;
      notices.push(notice);
      return Promise.resolve(
        link({
          requesterId: ME,
          addresseeId: THEM,
          requester: user(ME),
          addressee: user(THEM),
        }),
      );
    },
    acceptLink: (_id: string, _now: Date, notice: BuddyNotice) => {
      notices.push(notice);
      return Promise.resolve(link({ status: 'accepted' }));
    },
    ratingTrip: () => Promise.resolve(options.trip ?? null),
    upsertRating: (_t: string, _r: string, score: { rateeId: string }) => {
      ratings.push(score.rateeId);
      return Promise.resolve();
    },
  } as unknown as BuddiesRepository;
  const storage = {
    publicUrl: (key: string) => key,
  } as unknown as StorageService;
  return {
    service: new BuddiesService(repository, storage),
    notices,
    ratings,
    created: () => created,
  };
}

const SCORE = { reliable: 5, safety: 4, company: 5 };

describe('BuddiesService', () => {
  it('AC4: a demo caller cannot send requests; self is a 404', async () => {
    await expect(
      setup({ isDemo: true }).service.request(ME, THEM, NOW),
    ).rejects.toMatchObject({
      code: 'SECURED_ACCOUNT_REQUIRED',
    });
    await expect(setup().service.request(ME, ME, NOW)).rejects.toMatchObject({
      code: 'BUDDY_USER_NOT_FOUND',
    });
  });

  it('AC4: a request to someone who already asked me accepts theirs and notifies them', async () => {
    const { service, notices, created } = setup({ existing: link() });
    const result = await service.request(ME, THEM, NOW);
    expect(result.created).toBe(false);
    expect(result.link).toMatchObject({ status: 'accepted', userId: THEM });
    expect(created()).toBe(0);
    expect(notices).toEqual([
      expect.objectContaining({ userId: THEM, kind: 'buddy_accepted' }),
    ]);
  });

  it('AC4: my own pending request again is 409 BUDDY_EXISTS', async () => {
    const mine = link({ requesterId: ME, addresseeId: THEM });
    await expect(
      setup({ existing: mine }).service.request(ME, THEM, NOW),
    ).rejects.toMatchObject({ code: 'BUDDY_EXISTS' });
  });

  it('AC7: only attendees rate other attendees, never themselves, until backBy + 7 days', async () => {
    const backBy = new Date(NOW.getTime() - 86_400_000);
    const open = setup({ trip: ratingTrip(backBy, [ME, THEM]) });
    await expect(
      open.service.rate(ME, TRIP, ME, SCORE, NOW),
    ).rejects.toMatchObject({
      code: 'RATING_SELF',
    });
    await expect(
      open.service.rate(ME, TRIP, OTHER, SCORE, NOW),
    ).rejects.toMatchObject({
      code: 'NOT_ATTENDEE',
    });
    await expect(
      open.service.rate(OTHER, TRIP, THEM, SCORE, NOW),
    ).rejects.toMatchObject({
      code: 'NOT_ATTENDEE',
    });
    await open.service.rate(ME, TRIP, THEM, SCORE, NOW);
    expect(open.ratings).toEqual([THEM]);

    const late = new Date(backBy.getTime() + 8 * 86_400_000);
    await expect(
      open.service.rate(ME, TRIP, THEM, SCORE, late),
    ).rejects.toMatchObject({
      code: 'RATING_CLOSED',
    });
  });
});

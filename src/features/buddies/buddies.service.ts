import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { minusDays } from '../../lib/dates.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import { ProfileNotFoundError } from '../profile/profile.errors.js';
import {
  GroupTripNotFoundError,
  SecuredAccountRequiredError,
} from '../trip-events/trip-events.errors.js';
import type {
  AvailabilityInputDto,
  FindBuddiesQueryDto,
  TripRatingInputDto,
} from './dto/buddies.request.dto.js';
import type {
  AvailabilityDto,
  BuddiesListDto,
  BuddyCandidatePageDto,
  BuddyLinkDto,
  BuddyTripsDto,
  BuddyUserDto,
  MyPendingRatingsDto,
  TripRatingsPendingDto,
} from './dto/buddies.response.dto.js';
import {
  ACTIVE_WITHIN_DAYS,
  BUDDY_TRIPS_LIMIT,
  CARD_INTERESTS_MAX,
  FIND_PAGE_SIZE,
  FIND_POOL_MAX,
  MENTOR_LEVEL,
  RATING_WINDOW_DAYS,
  type BuddyRelationCode,
} from './buddies.constants.js';
import {
  BuddyExistsError,
  BuddyNotFoundError,
  BuddyRequestNotFoundError,
  BuddyUserNotFoundError,
  NotAttendeeError,
  RatingClosedError,
  RatingSelfError,
} from './buddies.errors.js';
import {
  type BuddyNotice,
  type BuddyUserRow,
  type CallerRow,
  type LinkRow,
  type PlaceNames,
  BuddiesRepository,
} from './buddies.repository.js';
import {
  type RatingSummary,
  compareCandidates,
  isoDate,
  levelRange,
  overallMean,
  pairKey,
  parseOffset,
  ratingClosesAt,
  ratingSummary,
  tashkentWeekStart,
} from './buddies.rules.js';

/** What a profile adds for buddies (AC5 buddyCount, AC8 ratings). */
export interface BuddyProfileSummary {
  buddyCount: number;
  ratings: RatingSummary | null;
}

/** The viewer's buddy relation to a profile's owner. */
export interface BuddyRelation {
  userId: string;
  relation: BuddyRelationCode;
  linkId: string | null;
}

/** Buddy links, weekend availability, Find buddies, buddies' trips and trip ratings. */
@Injectable()
export class BuddiesService {
  constructor(
    private readonly repository: BuddiesRepository,
    private readonly storage: StorageService,
  ) {}

  /** AC1/AC2: filtered in SQL, sorted here, paged by an opaque offset cursor. */
  async find(
    userId: string,
    query: FindBuddiesQueryDto,
    now = new Date(),
  ): Promise<BuddyCandidatePageDto> {
    const offset = parseFindCursor(query.cursor);
    const me = await this.caller(userId);
    const weekStart = tashkentWeekStart(now);
    const pool = await this.repository.findCandidates({
      viewerId: userId,
      activeSince: minusDays(now, ACTIVE_WITHIN_DAYS),
      level: levelRange(query.level ?? 'any', me.level),
      region: query.region,
      interests: query.interests,
      freeWeek: query.weekend ? weekStart : undefined,
      take: FIND_POOL_MAX,
    });
    const ids = pool.map((row) => row.id);
    const [availability, ratings] = await Promise.all([
      this.repository.availabilityFor(ids, weekStart),
      this.repository.ratingAggregates(ids),
    ]);
    const sorted = pool
      .map((row) => {
        const days = availability.get(row.id) ?? { sat: false, sun: false };
        return {
          row,
          days,
          id: row.id,
          level: row.level,
          lastActiveAt: row.lastActiveAt,
          free: days.sat || days.sun,
          ratingMean: overallMean(ratings.get(row.id)),
        };
      })
      .sort(compareCandidates(me.level));
    const page = sorted.slice(offset, offset + FIND_PAGE_SIZE);
    const together = await this.repository.tripsTogether(
      userId,
      page.map((entry) => entry.id),
    );
    const next = offset + FIND_PAGE_SIZE;
    return {
      items: page.map(({ row, days: free, ratingMean }) => {
        const aggregate = ratings.get(row.id);
        return {
          ...this.user(row),
          verifiedLeader: row.level >= MENTOR_LEVEL,
          region: row.showHomeRegion ? row.homeRegion : null,
          interests: row.interests.slice(0, CARD_INTERESTS_MAX),
          rating:
            ratingMean !== null && aggregate
              ? { mean: ratingMean, raters: aggregate.raters }
              : null,
          tripsTogether: together.get(row.id) ?? 0,
          free: { sat: free.sat, sun: free.sun },
        };
      }),
      nextCursor: next < sorted.length ? encodeCursor({ offset: next }) : null,
      matchCount: sorted.length,
    };
  }

  /** AC3: a week with no row reads as not free. */
  async getAvailability(
    userId: string,
    now = new Date(),
  ): Promise<AvailabilityDto> {
    const weekStart = tashkentWeekStart(now);
    const value = await this.repository.getAvailability(userId, weekStart);
    return { weekStart: isoDate(weekStart), sat: value.sat, sun: value.sun };
  }

  async putAvailability(
    userId: string,
    dto: AvailabilityInputDto,
    now = new Date(),
  ): Promise<AvailabilityDto> {
    const weekStart = tashkentWeekStart(now);
    const value = await this.repository.putAvailability(userId, weekStart, {
      sat: dto.sat,
      sun: dto.sun,
    });
    return { weekStart: isoDate(weekStart), sat: value.sat, sun: value.sun };
  }

  /**
   * AC4: secured callers only. A reverse pending request is accepted instead of failing.
   * `created` is false when that happened (the controller answers 200).
   */
  async request(
    userId: string,
    targetId: string,
    now = new Date(),
  ): Promise<{ link: BuddyLinkDto; created: boolean }> {
    const me = await this.caller(userId);
    if (me.isDemo) throw new SecuredAccountRequiredError();
    const target = await this.repository.findTarget(targetId);
    if (
      !target ||
      target.id === userId ||
      target.isDemo ||
      target.deletedAt !== null ||
      target.blockedAt !== null
    ) {
      throw new BuddyUserNotFoundError();
    }
    const key = pairKey(userId, targetId);
    const existing = await this.repository.findLinkByPair(key);
    if (existing) {
      if (existing.status === 'pending' && existing.addresseeId === userId) {
        const accepted = await this.repository.acceptLink(
          existing.id,
          now,
          acceptedNotice(me, existing.requesterId),
        );
        if (!accepted) throw new BuddyExistsError();
        return { link: this.link(accepted, userId), created: false };
      }
      throw new BuddyExistsError();
    }
    const link = await this.repository.createLink(
      userId,
      targetId,
      key,
      requestNotice(me, targetId),
    );
    if (!link) throw new BuddyExistsError();
    return { link: this.link(link, userId), created: true };
  }

  async accept(
    userId: string,
    linkId: string,
    now = new Date(),
  ): Promise<BuddyLinkDto> {
    const link = await this.incoming(userId, linkId);
    const me = await this.caller(userId);
    const accepted = await this.repository.acceptLink(
      link.id,
      now,
      acceptedNotice(me, link.requesterId),
    );
    if (!accepted) throw new BuddyRequestNotFoundError();
    return this.link(accepted, userId);
  }

  /** Decline deletes the row, so the requester may ask again later. */
  async decline(userId: string, linkId: string): Promise<void> {
    const link = await this.incoming(userId, linkId);
    await this.repository.deleteLink(link.id);
  }

  /** Removes an accepted buddy (either side) or cancels my outgoing pending request. */
  async remove(userId: string, otherId: string): Promise<void> {
    if (otherId === userId) throw new BuddyNotFoundError();
    const link = await this.repository.findLinkByPair(pairKey(userId, otherId));
    const removable =
      link &&
      (link.status === 'accepted' ||
        (link.status === 'pending' && link.requesterId === userId));
    if (!link || !removable) throw new BuddyNotFoundError();
    await this.repository.deleteLink(link.id);
  }

  /** AC5. */
  async list(userId: string): Promise<BuddiesListDto> {
    const links = await this.repository.listLinks(userId);
    const result: BuddiesListDto = { buddies: [], incoming: [], outgoing: [] };
    for (const row of links) {
      const dto = this.link(row, userId);
      if (row.status === 'accepted') result.buddies.push(dto);
      else if (row.addresseeId === userId) result.incoming.push(dto);
      else result.outgoing.push(dto);
    }
    return result;
  }

  /** AC5/AC8 for the profile screens. */
  async profileSummary(userId: string): Promise<BuddyProfileSummary> {
    const [buddyCount, ratings] = await Promise.all([
      this.repository.countBuddies(userId),
      this.repository.ratingAggregates([userId]),
    ]);
    return { buddyCount, ratings: ratingSummary(ratings.get(userId)) };
  }

  /** AC5/AC8 by username: missing, private, deleted and blocked are the profile's own 404. */
  async publicSummary(rawUsername: string): Promise<BuddyProfileSummary> {
    const targetId = await this.publicProfileId(rawUsername);
    return this.profileSummary(targetId);
  }

  /** The viewer's relation to a public profile; same 404 rules as the summary. */
  async relation(
    rawUsername: string,
    viewerId: string | undefined,
  ): Promise<BuddyRelation> {
    const userId = await this.publicProfileId(rawUsername);
    if (!viewerId) return { userId, relation: 'none', linkId: null };
    if (viewerId === userId) return { userId, relation: 'self', linkId: null };
    const link = await this.repository.findLinkByPair(
      pairKey(viewerId, userId),
    );
    if (!link) return { userId, relation: 'none', linkId: null };
    if (link.status === 'accepted') {
      return { userId, relation: 'buddies', linkId: null };
    }
    return link.addresseeId === viewerId
      ? { userId, relation: 'incoming', linkId: link.id }
      : { userId, relation: 'outgoing', linkId: null };
  }

  private async publicProfileId(rawUsername: string): Promise<string> {
    const target = await this.repository.findProfileTarget(
      rawUsername.trim().toLowerCase(),
    );
    if (
      !target ||
      !target.publicProfile ||
      target.deletedAt !== null ||
      target.blockedAt !== null
    ) {
      throw new ProfileNotFoundError();
    }
    return target.id;
  }

  /** AC6. */
  async trips(userId: string, now = new Date()): Promise<BuddyTripsDto> {
    const rows = await this.repository.buddyTrips(
      userId,
      now,
      BUDDY_TRIPS_LIMIT,
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        placeName: names(row.place),
        startAt: row.startAt.toISOString(),
        approvedCount: row._count.members,
        maxPeople: row.maxPeople,
        buddies: row.members.map(({ user }) => ({
          userId: user.id,
          displayName: user.displayName,
          username: user.username,
        })),
      })),
    };
  }

  /** AC7: other attendees with my own scores (never anyone else's). */
  async pendingForTrip(
    userId: string,
    tripId: string,
  ): Promise<TripRatingsPendingDto> {
    const trip = await this.repository.ratingTrip(tripId);
    if (!trip) throw new GroupTripNotFoundError();
    if (!trip.members.some(({ user }) => user.id === userId)) {
      throw new NotAttendeeError();
    }
    const scores = await this.repository.myScores(userId, [trip.id]);
    const byRatee = new Map(scores.map((score) => [score.rateeId, score]));
    return {
      groupTripId: trip.id,
      closesAt: ratingClosesAt(trip.backBy).toISOString(),
      attendees: trip.members
        .filter(({ user }) => user.id !== userId)
        .map(({ user }) => {
          const score = byRatee.get(user.id);
          return {
            ...this.user(user),
            myScores: score
              ? {
                  reliable: score.reliable,
                  safety: score.safety,
                  company: score.company,
                }
              : null,
          };
        }),
    };
  }

  async rate(
    userId: string,
    tripId: string,
    rateeId: string,
    dto: TripRatingInputDto,
    now = new Date(),
  ): Promise<void> {
    const trip = await this.repository.ratingTrip(tripId);
    if (!trip) throw new GroupTripNotFoundError();
    const attendees = new Set(trip.members.map(({ user }) => user.id));
    if (!attendees.has(userId)) throw new NotAttendeeError();
    if (rateeId === userId) throw new RatingSelfError();
    if (!attendees.has(rateeId)) throw new NotAttendeeError();
    if (now.getTime() > ratingClosesAt(trip.backBy).getTime()) {
      throw new RatingClosedError();
    }
    await this.repository.upsertRating(trip.id, userId, {
      rateeId,
      reliable: dto.reliable,
      safety: dto.safety,
      company: dto.company,
    });
  }

  /** AC7 Home card: open trips where I still have someone to rate. */
  async myPending(
    userId: string,
    now = new Date(),
  ): Promise<MyPendingRatingsDto> {
    const trips = await this.repository.attendedTrips(
      userId,
      minusDays(now, RATING_WINDOW_DAYS),
    );
    const scores = await this.repository.myScores(
      userId,
      trips.map((trip) => trip.id),
    );
    const rated = new Set(
      scores.map((score) => `${score.groupTripId}:${score.rateeId}`),
    );
    const items = trips
      .map((trip) => ({
        trip,
        unrated: trip.members.filter(
          ({ user }) =>
            user.id !== userId && !rated.has(`${trip.id}:${user.id}`),
        ).length,
      }))
      .filter(({ unrated }) => unrated > 0)
      .map(({ trip, unrated }) => ({
        groupTripId: trip.id,
        placeName: names(trip.place),
        startAt: trip.startAt.toISOString(),
        closesAt: ratingClosesAt(trip.backBy).toISOString(),
        unrated,
      }));
    return { items };
  }

  private async caller(userId: string): Promise<CallerRow> {
    const me = await this.repository.findCaller(userId);
    if (!me) throw new BuddyUserNotFoundError();
    return me;
  }

  private async incoming(userId: string, linkId: string): Promise<LinkRow> {
    const link = await this.repository.findLink(linkId);
    if (!link || link.status !== 'pending' || link.addresseeId !== userId) {
      throw new BuddyRequestNotFoundError();
    }
    return link;
  }

  private link(row: LinkRow, viewerId: string): BuddyLinkDto {
    const other = row.requesterId === viewerId ? row.addressee : row.requester;
    return { id: row.id, status: row.status, ...this.user(other) };
  }

  private user(row: BuddyUserRow): BuddyUserDto {
    return {
      userId: row.id,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: this.avatarUrl(row.avatarKey),
      level: row.level,
    };
  }

  /** Storage being down must not fail the list: the app falls back to initials. */
  private avatarUrl(key: string | null): string | null {
    if (key === null) return null;
    try {
      return this.storage.publicUrl(key);
    } catch (error) {
      if (error instanceof StorageUnavailableError) return null;
      throw error;
    }
  }
}

function names(place: PlaceNames): { uz: string; ru: string; en: string } {
  return {
    uz: place.nameUz,
    ru: place.nameRu ?? place.nameUz,
    en: place.nameEn ?? place.nameUz,
  };
}

function who(me: CallerRow): string {
  return me.displayName ?? `@${me.username}`;
}

function requestNotice(me: CallerRow, addresseeId: string): BuddyNotice {
  const name = who(me);
  return {
    userId: addresseeId,
    kind: 'buddy_request',
    title: {
      uz: `${name} sizga sayohat hamrohi bo'lishni taklif qilmoqda`,
      ru: `${name} хочет стать вашим напарником`,
      en: `${name} wants to be your trip buddy`,
    },
    data: { userId: me.id },
  };
}

function acceptedNotice(me: CallerRow, requesterId: string): BuddyNotice {
  const name = who(me);
  return {
    userId: requesterId,
    kind: 'buddy_accepted',
    title: {
      uz: `${name} hamroh so'rovingizni qabul qildi`,
      ru: `${name} принял(а) вашу заявку в напарники`,
      en: `${name} accepted your buddy request`,
    },
    data: { userId: me.id },
  };
}

function parseFindCursor(raw: string | undefined): number {
  if (!raw) return 0;
  const offset = parseOffset(decodeCursor(raw));
  if (offset === null)
    throw new RequestValidationError({ cursor: ['invalid'] });
  return offset;
}

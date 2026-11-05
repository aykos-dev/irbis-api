import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { PlaceNotFoundError } from '../places/places.errors.js';
import { EmergencyContactRequiredError } from '../trip-plan/trip-plan.errors.js';
import { TripPlanService } from '../trip-plan/trip-plan.service.js';
import type {
  CreateGroupTripDto,
  GroupTripsQueryDto,
  JoinGroupTripDto,
} from './dto/trip-events.request.dto.js';
import type {
  GroupTripDto,
  GroupTripsPageDto,
} from './dto/trip-events.response.dto.js';
import {
  GROUP_TRIP_PAGE_SIZE,
  VERIFIED_LEADER_LEVEL,
} from './trip-events.constants.js';
import {
  AlreadyRequestedError,
  GroupLinkForbiddenError,
  GroupTripClosedError,
  GroupTripFullError,
  GroupTripNotFoundError,
  SecuredAccountRequiredError,
  TripLeaderRequiredError,
} from './trip-events.errors.js';
import {
  type CallerRow,
  type GroupTripRow,
  type TripNotice,
  TripEventsRepository,
} from './trip-events.repository.js';
import { isFull, spotsLeft, validateGroupTrip } from './trip-events.rules.js';

@Injectable()
export class TripEventsService {
  constructor(
    private readonly repository: TripEventsRepository,
    private readonly gameConfig: GameConfigService,
    private readonly tripPlan: TripPlanService,
  ) {}

  /** AC1: owner/admin of the linked groups; leader row + leader's planned Trip together. */
  async create(
    userId: string,
    dto: CreateGroupTripDto,
    now = new Date(),
  ): Promise<GroupTripDto> {
    await this.securedCaller(userId);
    const led = new Set(await this.repository.ledGroupIds(userId));
    if (led.size === 0) throw new TripLeaderRequiredError();
    const groupIds = [...new Set(dto.groupIds)];
    if (groupIds.some((id) => !led.has(id))) {
      throw new GroupLinkForbiddenError();
    }
    const config = await this.gameConfig.tripConfig(now.getTime());
    const fields = validateGroupTrip(dto, now, config.maxDurationH);
    if (!(await this.repository.placeExists(dto.placeId))) {
      throw new PlaceNotFoundError();
    }
    const id = await this.repository.create(
      userId,
      dto.placeId,
      groupIds,
      fields,
      now,
    );
    return this.details(id, userId);
  }

  /** AC2: public to anyone; private only to people on the trip or in a linked group. */
  async details(id: string, viewerId?: string): Promise<GroupTripDto> {
    const trip = await this.visibleTrip(id, viewerId);
    return this.toDto(trip, viewerId);
  }

  async list(
    query: GroupTripsQueryDto,
    viewerId?: string,
    now = new Date(),
  ): Promise<GroupTripsPageDto> {
    const scope = query.scope ?? 'upcoming';
    if (scope === 'mine' && !viewerId) return { items: [], nextCursor: null };
    const rows = await this.repository.list({
      viewerId,
      placeId: query.placeId,
      groupId: query.groupId,
      scope,
      now,
      cursor: parseCursor(query.cursor),
      take: GROUP_TRIP_PAGE_SIZE + 1,
    });
    const page = rows.slice(0, GROUP_TRIP_PAGE_SIZE);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => this.toDto(row, viewerId)),
      nextCursor:
        rows.length > GROUP_TRIP_PAGE_SIZE && last
          ? encodeCursor({ startAt: last.startAt.toISOString(), id: last.id })
          : null,
    };
  }

  /** AC3: ask to join; the saved emergency contact (or the one sent now) covers the trip. */
  async request(
    userId: string,
    id: string,
    dto: JoinGroupTripDto,
    now = new Date(),
  ): Promise<GroupTripDto> {
    const caller = await this.securedCaller(userId);
    const trip = await this.visibleTrip(id, userId);
    if (trip.status !== 'open' || trip.startAt.getTime() <= now.getTime()) {
      throw new GroupTripClosedError();
    }
    const mine = trip.members.find((member) => member.userId === userId);
    if (mine) throw new AlreadyRequestedError();
    if (isFull(trip.maxPeople, approvedCount(trip))) {
      throw new GroupTripFullError();
    }
    if (!(await this.repository.hasContact(userId))) {
      if (!dto.contact) throw new EmergencyContactRequiredError();
      await this.tripPlan.putEmergencyContact(userId, dto.contact);
    }
    const who = caller.displayName ?? `@${caller.username}`;
    await this.repository.request(
      trip.id,
      userId,
      dto.note ? dto.note : null,
      notice(trip, trip.creatorId, userId, 'trip_request', {
        uz: `${who} ${placeName(trip, 'uz')} sayohatingizga qo'shilmoqchi`,
        ru: `${who} хочет присоединиться к поездке: ${placeName(trip, 'ru')}`,
        en: `${who} wants to join your trip to ${placeName(trip, 'en')}`,
      }),
    );
    return this.details(trip.id, userId);
  }

  /** AC4: the leader approves; the joiner gets a planned Trip linked to the group trip. */
  async approve(
    actorId: string,
    id: string,
    userId: string,
    now = new Date(),
  ): Promise<GroupTripDto> {
    const trip = await this.ledTrip(actorId, id);
    if (trip.status !== 'open') throw new GroupTripClosedError();
    await this.repository.approve(
      trip.id,
      userId,
      now,
      notice(trip, userId, userId, 'trip_approved', {
        uz: `Siz ${placeName(trip, 'uz')} sayohatiga qabul qilindingiz`,
        ru: `Вас приняли в поездку: ${placeName(trip, 'ru')}`,
        en: `You're in: trip to ${placeName(trip, 'en')}`,
      }),
    );
    return this.details(trip.id, actorId);
  }

  async reject(
    actorId: string,
    id: string,
    userId: string,
    now = new Date(),
  ): Promise<GroupTripDto> {
    const trip = await this.ledTrip(actorId, id);
    await this.repository.reject(
      trip.id,
      userId,
      now,
      notice(trip, userId, userId, 'trip_rejected', {
        uz: `${placeName(trip, 'uz')} sayohatiga so'rovingiz rad etildi`,
        ru: `Ваша заявка на поездку «${placeName(trip, 'ru')}» отклонена`,
        en: `Your request to join the trip to ${placeName(trip, 'en')} was declined`,
      }),
    );
    return this.details(trip.id, actorId);
  }

  private async securedCaller(userId: string): Promise<CallerRow> {
    const caller = await this.repository.findCaller(userId);
    if (!caller || caller.isDemo) throw new SecuredAccountRequiredError();
    return caller;
  }

  private async visibleTrip(
    id: string,
    viewerId?: string,
  ): Promise<GroupTripRow> {
    const trip = await this.repository.find(id);
    if (!trip) throw new GroupTripNotFoundError();
    if (
      trip.visibility === 'private' &&
      !(viewerId && (await this.repository.canSeePrivate(trip.id, viewerId)))
    ) {
      throw new GroupTripNotFoundError();
    }
    return trip;
  }

  private async ledTrip(actorId: string, id: string): Promise<GroupTripRow> {
    const trip = await this.visibleTrip(id, actorId);
    if (!isLeader(trip, actorId)) {
      throw new TripLeaderRequiredError('Only the trip leader can do this');
    }
    return trip;
  }

  private toDto(trip: GroupTripRow, viewerId?: string): GroupTripDto {
    const approved = trip.members.filter((m) => m.status === 'approved');
    const mine = viewerId
      ? trip.members.find((member) => member.userId === viewerId)
      : undefined;
    const leader = viewerId !== undefined && isLeader(trip, viewerId);
    return {
      id: trip.id,
      place: {
        id: trip.place.id,
        slug: trip.place.slug,
        names: {
          uz: trip.place.nameUz,
          ru: placeName(trip, 'ru'),
          en: placeName(trip, 'en'),
        },
        type: trip.place.type,
        difficulty: trip.place.difficulty,
        requiredLevel: trip.place.requiredLevel,
      },
      visibility: trip.visibility,
      status: trip.status,
      startAt: trip.startAt.toISOString(),
      backBy: trip.backBy.toISOString(),
      meeting: {
        text: trip.meetingText,
        lat: trip.meetingLat,
        lng: trip.meetingLng,
      },
      carpool:
        trip.carpoolFrom !== null && trip.carpoolSeats !== null
          ? { from: trip.carpoolFrom, seats: trip.carpoolSeats }
          : null,
      maxPeople: trip.maxPeople,
      minLevel: trip.minLevel,
      gear: { keys: trip.gearKeys, custom: trip.customGear },
      description: trip.description,
      leader: {
        id: trip.creator.id,
        username: trip.creator.username,
        displayName: trip.creator.displayName,
        level: trip.creator.level,
        verifiedLeader: trip.creator.level >= VERIFIED_LEADER_LEVEL,
      },
      groups: trip.groups.map(({ group }) => ({
        id: group.id,
        name: group.name,
      })),
      approvedCount: approved.length,
      spotsLeft: spotsLeft(trip.maxPeople, approved.length),
      me: mine ? { role: mine.role, status: mine.status } : null,
      participants: approved.map(({ user }) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
      })),
      requests: leader
        ? trip.members
            .filter((member) => member.status === 'pending')
            .map((member) => ({
              userId: member.userId,
              username: member.user.username,
              level: member.user.level,
              note: member.note,
              createdAt: member.createdAt.toISOString(),
            }))
        : [],
    };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function approvedCount(trip: GroupTripRow): number {
  return trip.members.filter((member) => member.status === 'approved').length;
}

function isLeader(trip: GroupTripRow, userId: string): boolean {
  return trip.members.some(
    (member) =>
      member.userId === userId &&
      member.role === 'leader' &&
      member.status === 'approved',
  );
}

function placeName(trip: GroupTripRow, locale: 'uz' | 'ru' | 'en'): string {
  const { nameUz, nameRu, nameEn } = trip.place;
  if (locale === 'ru') return nameRu ?? nameUz;
  if (locale === 'en') return nameEn ?? nameUz;
  return nameUz;
}

function notice(
  trip: GroupTripRow,
  recipientId: string,
  subjectId: string,
  kind: string,
  title: TripNotice['title'],
): TripNotice {
  return {
    userId: recipientId,
    kind,
    title,
    data: { groupTripId: trip.id, userId: subjectId },
  };
}

function parseCursor(
  raw: string | undefined,
): { startAt: Date; id: string } | undefined {
  if (!raw) return undefined;
  const payload = decodeCursor(raw);
  const startAt =
    typeof payload?.startAt === 'string' ? new Date(payload.startAt) : null;
  const id =
    typeof payload?.id === 'string' && UUID.test(payload.id)
      ? payload.id
      : null;
  if (!startAt || Number.isNaN(startAt.getTime()) || !id) {
    throw new RequestValidationError({ cursor: ['invalid'] });
  }
  return { startAt, id };
}

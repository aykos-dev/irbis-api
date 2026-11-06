import { Injectable, Optional } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { GroupChatService } from '../group-chat/group-chat.service.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { PlaceNotFoundError } from '../places/places.errors.js';
import { EmergencyContactRequiredError } from '../trip-plan/trip-plan.errors.js';
import { TripPlanService } from '../trip-plan/trip-plan.service.js';
import type {
  AdminGroupTripsQueryDto,
  CreateGroupTripDto,
  GroupTripsQueryDto,
  JoinGroupTripDto,
  UpdateGroupTripDto,
} from './dto/trip-events.request.dto.js';
import type {
  AdminGroupTripsPageDto,
  GroupTripDto,
  GroupTripsPageDto,
  SearchGroupTripDto,
} from './dto/trip-events.response.dto.js';
import {
  ADMIN_GROUP_TRIP_PAGE_SIZE,
  GROUP_TRIP_PAGE_SIZE,
  VERIFIED_LEADER_LEVEL,
} from './trip-events.constants.js';
import {
  AlreadyRequestedError,
  GroupLinkForbiddenError,
  GroupTripClosedError,
  GroupTripFullError,
  GroupTripLockedError,
  GroupTripNotFoundError,
  LeaderCannotLeaveError,
  NotOnGroupTripError,
  SecuredAccountRequiredError,
  TripLeaderRequiredError,
} from './trip-events.errors.js';
import {
  type CallerRow,
  type GroupTripRow,
  type TripNotice,
  TripEventsRepository,
} from './trip-events.repository.js';
import {
  isEditLocked,
  isFull,
  mergeGroupTripPatch,
  spotsLeft,
  tashkentDayRange,
  validateGroupTrip,
} from './trip-events.rules.js';

@Injectable()
export class TripEventsService {
  constructor(
    private readonly repository: TripEventsRepository,
    private readonly gameConfig: GameConfigService,
    private readonly tripPlan: TripPlanService,
    @Optional() private readonly chat?: GroupChatService,
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
    const { id, messageIds } = await this.repository.create(
      userId,
      dto.placeId,
      groupIds,
      fields,
      now,
    );
    await this.chat?.announceTripCards(messageIds, userId);
    return this.details(id, userId);
  }

  /** AC5: leader-only edit until the trip's Tashkent start day; planned Trips follow place/window. */
  async update(
    userId: string,
    id: string,
    dto: UpdateGroupTripDto,
    now = new Date(),
  ): Promise<GroupTripDto> {
    const trip = await this.ledTrip(userId, id);
    if (trip.status !== 'open') throw new GroupTripClosedError();
    if (isEditLocked(trip.startAt, now)) throw new GroupTripLockedError();
    let groupIds: string[] | undefined;
    if (dto.groupIds) {
      groupIds = [...new Set(dto.groupIds)];
      const led = new Set(await this.repository.ledGroupIds(userId));
      const linked = new Set(trip.groups.map(({ group }) => group.id));
      if (groupIds.some((gid) => !linked.has(gid) && !led.has(gid))) {
        throw new GroupLinkForbiddenError();
      }
    }
    const config = await this.gameConfig.tripConfig(now.getTime());
    const fields = validateGroupTrip(
      mergeGroupTripPatch(trip, dto),
      now,
      config.maxDurationH,
    );
    const placeId = dto.placeId ?? trip.place.id;
    if (placeId !== trip.place.id) {
      if (!(await this.repository.placeExists(placeId))) {
        throw new PlaceNotFoundError();
      }
    }
    const messageIds = await this.repository.update(
      trip.id,
      placeId,
      fields,
      groupIds,
      this.memberNotices(trip, userId, 'trip_changed', {
        uz: `${placeName(trip, 'uz')} sayohati o'zgartirildi`,
        ru: `Поездка «${placeName(trip, 'ru')}» изменена`,
        en: `The trip to ${placeName(trip, 'en')} was updated`,
      }),
    );
    await this.chat?.announceTripCards(messageIds, userId);
    return this.details(trip.id, userId);
  }

  /** AC5: the leader cancels; planned Trips are deleted and members notified. */
  async cancel(
    userId: string,
    id: string,
    now = new Date(),
  ): Promise<GroupTripDto> {
    const trip = await this.ledTrip(userId, id);
    if (trip.status !== 'open') throw new GroupTripClosedError();
    await this.repository.cancel(trip.id, now, this.cancelNotices(trip));
    return this.details(trip.id, userId);
  }

  /** AC5: a member (pending or approved) leaves; their planned Trip goes too. */
  async leave(
    userId: string,
    id: string,
    now = new Date(),
  ): Promise<GroupTripDto> {
    const trip = await this.visibleTrip(id, userId);
    const mine = trip.members.find((member) => member.userId === userId);
    if (!mine) throw new NotOnGroupTripError();
    if (mine.role === 'leader') throw new LeaderCannotLeaveError();
    await this.repository.leave(trip.id, userId, now);
    return this.details(trip.id, userId);
  }

  /**
   * AC7: after an accepted check-in, the user's approved rows on open trips at that place
   * starting the same Tashkent day get attendedAt and a `trip_rate` notice. Idempotent, no XP.
   */
  async recordAttendance(
    userId: string,
    placeId: string,
    recordedAt: Date,
  ): Promise<void> {
    await this.repository.markAttended(
      userId,
      placeId,
      tashkentDayRange(recordedAt),
      recordedAt,
      (trip) => {
        const uz = trip.place.nameUz;
        const ru = trip.place.nameRu ?? uz;
        const en = trip.place.nameEn ?? uz;
        return {
          userId,
          kind: 'trip_rate',
          title: {
            uz: `${uz} sayohatidagi hamrohlaringizni baholang`,
            ru: `Оцените напарников по поездке: ${ru}`,
            en: `Rate your trip buddies: ${en}`,
          },
          data: { groupTripId: trip.id },
        };
      },
    );
  }

  /** AC8 search: open upcoming public trips by place name or description. */
  async search(
    term: string,
    take: number,
    now = new Date(),
  ): Promise<SearchGroupTripDto[]> {
    const rows = await this.repository.searchPublic(term, now, take);
    return rows.map((row) => ({
      id: row.id,
      placeName: row.place.nameEn ?? row.place.nameRu ?? row.place.nameUz,
      startAt: row.startAt.toISOString(),
      approvedCount: row._count.members,
      maxPeople: row.maxPeople,
    }));
  }

  /** AC8 admin list: every trip, newest start first. */
  async adminList(
    query: AdminGroupTripsQueryDto,
  ): Promise<AdminGroupTripsPageDto> {
    const take = ADMIN_GROUP_TRIP_PAGE_SIZE;
    const rows = await this.repository.adminList(
      query.status,
      parseCursor(query.cursor),
      take + 1,
    );
    const page = rows.slice(0, take);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => ({
        id: row.id,
        placeName: row.place.nameEn ?? row.place.nameRu ?? row.place.nameUz,
        leaderUsername: row.creator.username,
        startAt: row.startAt.toISOString(),
        status: row.status,
        approvedCount: row._count.members,
        maxPeople: row.maxPeople,
      })),
      nextCursor:
        rows.length > take && last
          ? encodeCursor({ startAt: last.startAt.toISOString(), id: last.id })
          : null,
    };
  }

  /** AC8 admin cancel: the leader-cancel effects plus an audit row. */
  async adminCancel(
    adminId: string,
    id: string,
    note: string,
    now = new Date(),
  ): Promise<GroupTripDto> {
    const trip = await this.repository.find(id);
    if (!trip) throw new GroupTripNotFoundError();
    if (trip.status !== 'open') throw new GroupTripClosedError();
    await this.repository.cancel(trip.id, now, this.cancelNotices(trip), {
      adminId,
      userId: trip.creatorId,
      note,
    });
    const updated = await this.repository.find(trip.id);
    if (!updated) throw new GroupTripNotFoundError();
    return this.toDto(updated);
  }

  private cancelNotices(trip: GroupTripRow): TripNotice[] {
    return this.memberNotices(trip, trip.creatorId, 'trip_cancelled', {
      uz: `${placeName(trip, 'uz')} sayohati bekor qilindi`,
      ru: `Поездка «${placeName(trip, 'ru')}» отменена`,
      en: `The trip to ${placeName(trip, 'en')} was cancelled`,
    });
  }

  /** One notice per pending/approved person other than `exceptId`. */
  private memberNotices(
    trip: GroupTripRow,
    exceptId: string,
    kind: string,
    title: TripNotice['title'],
  ): TripNotice[] {
    return trip.members
      .filter((member) => member.userId !== exceptId)
      .map((member) => notice(trip, member.userId, member.userId, kind, title));
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

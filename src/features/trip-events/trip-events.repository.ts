import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PlaceTypeCode } from '../places/places.constants.js';
import { EmergencyContactRequiredError } from '../trip-plan/trip-plan.errors.js';
import type {
  GroupTripMemberStatusCode,
  GroupTripRoleCode,
  GroupTripStatusCode,
  GroupTripVisibilityCode,
} from './trip-events.constants.js';
import {
  GroupTripClosedError,
  GroupTripFullError,
  GroupTripInvalidError,
  GroupTripRequestNotFoundError,
} from './trip-events.errors.js';
import type { GroupTripFields } from './trip-events.rules.js';

export interface GroupTripUser {
  id: string;
  username: string;
  displayName: string | null;
  level: number;
}

export interface GroupTripMemberRow {
  userId: string;
  role: GroupTripRoleCode;
  status: GroupTripMemberStatusCode;
  note: string | null;
  createdAt: Date;
  user: GroupTripUser;
}

export interface GroupTripRow {
  id: string;
  creatorId: string;
  visibility: GroupTripVisibilityCode;
  status: GroupTripStatusCode;
  startAt: Date;
  backBy: Date;
  meetingText: string;
  meetingLat: number | null;
  meetingLng: number | null;
  carpoolFrom: string | null;
  carpoolSeats: number | null;
  maxPeople: number | null;
  minLevel: number | null;
  gearKeys: string[];
  customGear: string[];
  description: string;
  place: {
    id: string;
    slug: string;
    nameUz: string;
    nameRu: string | null;
    nameEn: string | null;
    type: PlaceTypeCode;
    difficulty: number;
    requiredLevel: number;
  };
  creator: GroupTripUser;
  groups: { group: { id: string; name: string } }[];
  /** Pending and approved rows only. */
  members: GroupTripMemberRow[];
}

export interface CallerRow extends GroupTripUser {
  isDemo: boolean;
}

/** A notification row to write in the same transaction as the change it reports. */
export interface TripNotice {
  userId: string;
  kind: string;
  title: { uz: string; ru: string; en: string };
  data: Record<string, string>;
}

export interface ListFilter {
  viewerId?: string;
  placeId?: string;
  groupId?: string;
  /** upcoming: open trips starting at/after `now`. mine: my pending/approved trips not yet over. */
  scope: 'upcoming' | 'mine';
  now: Date;
  cursor?: { startAt: Date; id: string };
  take: number;
}

const searchSelect = {
  id: true,
  startAt: true,
  maxPeople: true,
  place: { select: { nameUz: true, nameRu: true, nameEn: true } },
  _count: { select: { members: { where: { status: 'approved' } } } },
} satisfies Prisma.GroupTripSelect;

export interface SearchTripRow {
  id: string;
  startAt: Date;
  maxPeople: number | null;
  place: { nameUz: string; nameRu: string | null; nameEn: string | null };
  _count: { members: number };
}

export interface AdminTripRow extends SearchTripRow {
  status: GroupTripStatusCode;
  creator: { username: string };
}

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  level: true,
} as const;

const tripInclude = {
  place: {
    select: {
      id: true,
      slug: true,
      nameUz: true,
      nameRu: true,
      nameEn: true,
      type: true,
      difficulty: true,
      requiredLevel: true,
    },
  },
  creator: { select: userSelect },
  groups: {
    select: { group: { select: { id: true, name: true } } },
    orderBy: { group: { name: 'asc' } },
  },
  members: {
    where: { status: { in: ['pending', 'approved'] } },
    select: {
      userId: true,
      role: true,
      status: true,
      note: true,
      createdAt: true,
      user: { select: userSelect },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.GroupTripInclude;

/** The only Prisma user for trip-events (group trips, their links, members and personal trips). */
@Injectable()
export class TripEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCaller(userId: string): Promise<CallerRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...userSelect, isDemo: true },
    });
  }

  /** Ids of groups where the user is an active owner or admin. */
  async ledGroupIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.groupMember.findMany({
      where: { userId, status: 'active', role: { in: ['owner', 'admin'] } },
      select: { groupId: true },
    });
    return rows.map((row) => row.groupId);
  }

  async placeExists(id: string): Promise<boolean> {
    const row = await this.prisma.place.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  async hasContact(userId: string): Promise<boolean> {
    const row = await this.prisma.emergencyContact.findUnique({
      where: { userId },
      select: { userId: true },
    });
    return row !== null;
  }

  /**
   * AC1: the group trip, its group links, the leader's planned Trip and the leader row in one
   * transaction, plus one chat card per linked group (AC8). Throws EMERGENCY_CONTACT_REQUIRED
   * when the leader has no saved contact.
   */
  async create(
    creatorId: string,
    placeId: string,
    groupIds: string[],
    fields: GroupTripFields,
    now: Date,
  ): Promise<{ id: string; messageIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.groupTrip.create({
        data: { ...fields, creatorId, placeId },
        select: { id: true },
      });
      const messageIds = await this.linkGroups(tx, trip.id, groupIds);
      const personalTripId = await this.createPersonalTrip(
        tx,
        creatorId,
        trip.id,
      );
      await tx.groupTripMember.create({
        data: {
          tripId: trip.id,
          userId: creatorId,
          role: 'leader',
          status: 'approved',
          personalTripId,
          decidedAt: now,
        },
      });
      return { id: trip.id, messageIds };
    });
  }

  /**
   * AC5: under a row lock, re-checks maxPeople against the approved count, saves the fields,
   * moves still-planned personal Trips with the place/window, swaps group links (new links get
   * a chat card) and writes the notices. Returns the new card message ids.
   */
  async update(
    tripId: string,
    placeId: string,
    fields: GroupTripFields,
    groupIds: string[] | undefined,
    notices: TripNotice[],
  ): Promise<string[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM group_trips WHERE id = ${tripId}::uuid FOR UPDATE`;
      const approved = await tx.groupTripMember.count({
        where: { tripId, status: 'approved' },
      });
      if (fields.maxPeople !== null && fields.maxPeople < approved) {
        throw new GroupTripInvalidError({ maxPeople: ['belowApproved'] });
      }
      await tx.groupTrip.update({
        where: { id: tripId },
        data: { ...fields, placeId },
      });
      await tx.trip.updateMany({
        where: { groupTripId: tripId, status: 'planned' },
        data: { placeId, startAt: fields.startAt, backBy: fields.backBy },
      });
      let messageIds: string[] = [];
      if (groupIds) {
        const linked = await tx.groupTripGroup.findMany({
          where: { tripId },
          select: { groupId: true },
        });
        const keep = new Set(groupIds);
        const had = new Set(linked.map((row) => row.groupId));
        await tx.groupTripGroup.deleteMany({
          where: { tripId, groupId: { notIn: groupIds } },
        });
        messageIds = await this.linkGroups(
          tx,
          tripId,
          [...keep].filter((id) => !had.has(id)),
        );
      }
      if (notices.length) {
        await tx.notification.createMany({
          data: notices.map((notice) => this.notification(notice)),
        });
      }
      return messageIds;
    });
  }

  /**
   * AC5 cancel (leader or admin): status cancelled, still-planned personal Trips deleted,
   * notices written and, for an admin, the audit row, all in one transaction.
   */
  async cancel(
    tripId: string,
    now: Date,
    notices: TripNotice[],
    audit?: { adminId: string; userId: string; note: string },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.groupTrip.updateMany({
        where: { id: tripId, status: 'open' },
        data: { status: 'cancelled', cancelledAt: now },
      });
      if (count === 0) throw new GroupTripClosedError();
      await tx.trip.deleteMany({
        where: { groupTripId: tripId, status: 'planned' },
      });
      if (notices.length) {
        await tx.notification.createMany({
          data: notices.map((notice) => this.notification(notice)),
        });
      }
      if (audit) {
        await tx.adminAuditLog.create({
          data: {
            adminId: audit.adminId,
            userId: audit.userId,
            action: 'cancel_group_trip',
            note: audit.note,
            detail: tripId,
          },
        });
      }
    });
  }

  /** AC5 leave: the row becomes `left` and the caller's still-planned Trip is deleted. */
  async leave(tripId: string, userId: string, now: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.groupTripMember.update({
        where: { tripId_userId: { tripId, userId } },
        data: { status: 'left', personalTripId: null, decidedAt: now },
      });
      await tx.trip.deleteMany({
        where: { groupTripId: tripId, userId, status: 'planned' },
      });
    });
  }

  /**
   * AC7: stamps attendedAt on the user's approved rows for open trips at the place starting
   * within [from, to). Rows already stamped are left alone, so a repeat is a no-op. Each row
   * this call stamps also gets its `trip_rate` notice (buddies AC7), once per member per trip.
   */
  async markAttended(
    userId: string,
    placeId: string,
    range: { from: Date; to: Date },
    at: Date,
    rateNotice: (trip: {
      id: string;
      place: { nameUz: string; nameRu: string | null; nameEn: string | null };
    }) => TripNotice,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.groupTripMember.findMany({
        where: {
          userId,
          status: 'approved',
          attendedAt: null,
          trip: {
            placeId,
            status: 'open',
            startAt: { gte: range.from, lt: range.to },
          },
        },
        select: {
          id: true,
          trip: {
            select: {
              id: true,
              place: { select: { nameUz: true, nameRu: true, nameEn: true } },
            },
          },
        },
      });
      let stamped = 0;
      for (const row of rows) {
        const { count } = await tx.groupTripMember.updateMany({
          where: { id: row.id, attendedAt: null },
          data: { attendedAt: at },
        });
        if (count === 0) continue;
        stamped += 1;
        await tx.notification.create({
          data: this.notification(rateNotice(row.trip)),
        });
      }
      return stamped;
    });
  }

  /** AC8 search: open, upcoming, public trips matching a place name (any locale) or the description. */
  searchPublic(
    term: string,
    now: Date,
    take: number,
  ): Promise<SearchTripRow[]> {
    const contains = { contains: term, mode: 'insensitive' as const };
    return this.prisma.groupTrip.findMany({
      where: {
        visibility: 'public',
        status: 'open',
        startAt: { gte: now },
        OR: [
          { description: contains },
          { place: { nameUz: contains } },
          { place: { nameRu: contains } },
          { place: { nameEn: contains } },
        ],
      },
      select: searchSelect,
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      take,
    });
  }

  /** AC8 admin: every trip, newest start first, optionally by status. */
  adminList(
    status: GroupTripStatusCode | undefined,
    cursor: { startAt: Date; id: string } | undefined,
    take: number,
  ): Promise<AdminTripRow[]> {
    const and: Prisma.GroupTripWhereInput[] = [];
    if (status) and.push({ status });
    if (cursor) {
      and.push({
        OR: [
          { startAt: { lt: cursor.startAt } },
          { startAt: cursor.startAt, id: { lt: cursor.id } },
        ],
      });
    }
    return this.prisma.groupTrip.findMany({
      where: { AND: and },
      select: {
        ...searchSelect,
        status: true,
        creator: { select: { username: true } },
      },
      orderBy: [{ startAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  /** One `trip` chat message per group, its id kept on the link row. */
  private async linkGroups(
    tx: Prisma.TransactionClient,
    tripId: string,
    groupIds: string[],
  ): Promise<string[]> {
    const messageIds: string[] = [];
    for (const groupId of groupIds) {
      const message = await tx.groupMessage.create({
        data: { groupId, kind: 'trip', groupTripId: tripId },
        select: { id: true },
      });
      await tx.groupTripGroup.create({
        data: { tripId, groupId, messageId: message.id },
      });
      messageIds.push(message.id);
    }
    return messageIds;
  }

  find(id: string): Promise<GroupTripRow | null> {
    return this.prisma.groupTrip.findUnique({
      where: { id },
      include: tripInclude,
    });
  }

  /** AC2: a private trip is visible to anyone with a row on it or active in a linked group. */
  async canSeePrivate(tripId: string, userId: string): Promise<boolean> {
    const row = await this.prisma.groupTrip.findFirst({
      where: { id: tripId, ...this.privateAccess(userId) },
      select: { id: true },
    });
    return row !== null;
  }

  list(filter: ListFilter): Promise<GroupTripRow[]> {
    const { viewerId, cursor } = filter;
    const and: Prisma.GroupTripWhereInput[] = [
      viewerId
        ? { OR: [{ visibility: 'public' }, this.privateAccess(viewerId)] }
        : { visibility: 'public' },
    ];
    if (filter.placeId) and.push({ placeId: filter.placeId });
    if (filter.groupId) {
      and.push({ groups: { some: { groupId: filter.groupId } } });
    }
    if (filter.scope === 'upcoming') {
      and.push({ status: 'open', startAt: { gte: filter.now } });
    } else {
      and.push({
        backBy: { gte: filter.now },
        members: {
          some: { userId: viewerId, status: { in: ['pending', 'approved'] } },
        },
      });
    }
    if (cursor) {
      and.push({
        OR: [
          { startAt: { gt: cursor.startAt } },
          { startAt: cursor.startAt, id: { gt: cursor.id } },
        ],
      });
    }
    return this.prisma.groupTrip.findMany({
      where: { AND: and },
      include: tripInclude,
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      take: filter.take,
    });
  }

  async memberStatus(
    tripId: string,
    userId: string,
  ): Promise<GroupTripMemberStatusCode | null> {
    const row = await this.prisma.groupTripMember.findUnique({
      where: { tripId_userId: { tripId, userId } },
      select: { status: true },
    });
    return row?.status ?? null;
  }

  /** AC3: a new or renewed pending row plus the leader's notification. */
  async request(
    tripId: string,
    userId: string,
    note: string | null,
    notice: TripNotice,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.groupTripMember.upsert({
        where: { tripId_userId: { tripId, userId } },
        create: { tripId, userId, role: 'member', status: 'pending', note },
        update: {
          status: 'pending',
          note,
          decidedAt: null,
          personalTripId: null,
        },
      });
      await tx.notification.create({ data: this.notification(notice) });
    });
  }

  /**
   * AC4: under a row lock on the group trip, checks the cap, creates the joiner's planned Trip,
   * marks the row approved and notifies the joiner.
   */
  async approve(
    tripId: string,
    userId: string,
    now: Date,
    notice: TripNotice,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM group_trips WHERE id = ${tripId}::uuid FOR UPDATE`;
      const trip = await tx.groupTrip.findUniqueOrThrow({
        where: { id: tripId },
        select: { maxPeople: true },
      });
      const pending = await tx.groupTripMember.findUnique({
        where: { tripId_userId: { tripId, userId } },
        select: { status: true },
      });
      if (pending?.status !== 'pending') {
        throw new GroupTripRequestNotFoundError();
      }
      const approved = await tx.groupTripMember.count({
        where: { tripId, status: 'approved' },
      });
      if (trip.maxPeople !== null && approved >= trip.maxPeople) {
        throw new GroupTripFullError();
      }
      const personalTripId = await this.createPersonalTrip(tx, userId, tripId);
      await tx.groupTripMember.update({
        where: { tripId_userId: { tripId, userId } },
        data: { status: 'approved', personalTripId, decidedAt: now },
      });
      await tx.notification.create({ data: this.notification(notice) });
    });
  }

  /** AC4: pending → rejected plus the joiner's notification. */
  async reject(
    tripId: string,
    userId: string,
    now: Date,
    notice: TripNotice,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.groupTripMember.updateMany({
        where: { tripId, userId, status: 'pending' },
        data: { status: 'rejected', decidedAt: now },
      });
      if (count === 0) throw new GroupTripRequestNotFoundError();
      await tx.notification.create({ data: this.notification(notice) });
    });
  }

  private privateAccess(userId: string): Prisma.GroupTripWhereInput {
    return {
      OR: [
        { members: { some: { userId } } },
        {
          groups: {
            some: {
              group: { members: { some: { userId, status: 'active' } } },
            },
          },
        },
      ],
    };
  }

  /**
   * A planned personal Trip for the group trip's place and window, alert on, with the user's
   * emergency contact snapshot (like POST /v1/trips; planAheadDays does not apply here).
   */
  private async createPersonalTrip(
    tx: Prisma.TransactionClient,
    userId: string,
    groupTripId: string,
  ): Promise<string> {
    const contact = await tx.emergencyContact.findUnique({
      where: { userId },
      select: { name: true, relation: true, phone: true, phoneLast2: true },
    });
    if (!contact) throw new EmergencyContactRequiredError();
    const groupTrip = await tx.groupTrip.findUniqueOrThrow({
      where: { id: groupTripId },
      select: { placeId: true, startAt: true, backBy: true },
    });
    const trip = await tx.trip.create({
      data: {
        userId,
        placeId: groupTrip.placeId,
        status: 'planned',
        startAt: groupTrip.startAt,
        backBy: groupTrip.backBy,
        alertEnabled: true,
        contactName: contact.name,
        contactRelation: contact.relation,
        contactPhone: contact.phone,
        contactPhoneLast2: contact.phoneLast2,
        groupTripId,
      },
      select: { id: true },
    });
    return trip.id;
  }

  private notification(
    notice: TripNotice,
  ): Prisma.NotificationUncheckedCreateInput {
    return {
      userId: notice.userId,
      category: 'trips',
      kind: notice.kind,
      title: notice.title,
      data: notice.data,
    };
  }
}

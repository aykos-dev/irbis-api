import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { OpenMeteoDaily } from '../conditions/condition.rules.js';
import type { PlaceTypeCode } from '../places/places.constants.js';
import { TripAlreadyActiveError } from './trip-plan.errors.js';
import type { LocaleCode } from '../auth/auth.constants.js';
import {
  ALERT_MAX_ATTEMPTS,
  type TripStatusCode,
} from './trip-plan.constants.js';

export interface PreviewPlace {
  id: string;
  type: PlaceTypeCode;
  latitude: number;
  longitude: number;
  daily: OpenMeteoDaily | null;
}

/** Stored contact: `phone` is PhoneCipher ciphertext. */
export interface StoredContact {
  name: string;
  relation: string;
  phone: string;
  phoneLast2: string;
}

export interface TripPlace {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string | null;
  nameEn: string | null;
  type: PlaceTypeCode;
  latitude: number;
  longitude: number;
}

export interface TripRecord {
  id: string;
  status: TripStatusCode;
  startAt: Date;
  backBy: Date;
  alertEnabled: boolean;
  contactName: string;
  contactRelation: string;
  contactPhoneLast2: string;
  startedAt: Date | null;
  checkedOutAt: Date | null;
  alertSentAt: Date | null;
  place: TripPlace;
}

/** Active-trip columns of a trip (live link, last fix time, totals, waypoints). */
export interface TripLiveFields {
  liveToken: string | null;
  lastLocationAt: Date | null;
  distanceM: number;
  climbM: number;
  waypoints: TripWaypointRecord[];
}

/** A trip as the repository reads it. */
export type TripRow = TripRecord & TripLiveFields;

export interface TripWaypointRecord {
  n: number;
  lat: number;
  lng: number;
  recordedAt: Date;
}

/** One location ping with the client's running totals. */
export interface TripPing {
  lat: number;
  lng: number;
  accuracyM: number;
  recordedAt: Date;
  distanceM: number;
  climbM: number;
}

/** What the public live page reads for a token. */
export interface LiveTripRecord {
  status: TripStatusCode;
  backBy: Date;
  checkedOutAt: Date | null;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: Date | null;
  user: { username: string; displayName: string | null };
  place: { nameUz: string; nameRu: string | null; nameEn: string | null };
}

export interface NewTrip {
  userId: string;
  placeId: string;
  status: 'planned' | 'active';
  startAt: Date;
  backBy: Date;
  alertEnabled: boolean;
  contact: StoredContact;
  startedAt: Date | null;
  location: { lat: number; lng: number; accuracyM: number } | null;
  liveToken: string | null;
}

export interface TripLocation {
  lat: number;
  lng: number;
  accuracyM: number;
}

/** Fields a lifecycle step may change. */
export interface TripChange {
  status?: TripStatusCode;
  startAt?: Date;
  backBy?: Date;
  alertEnabled?: boolean;
  startedAt?: Date;
  checkedOutAt?: Date;
  location?: TripLocation | null;
  liveToken?: string;
  distanceM?: number;
  climbM?: number;
}

/** Only apply the change while the trip still is in one of `statuses` (and, with `alertNotSent`, unalerted). */
export interface TripGuard {
  statuses: TripStatusCode[];
  alertNotSent?: boolean;
}

/** An active trip whose alert is due: everything the SMS needs. `contactPhone` is PhoneCipher ciphertext. */
export interface DueAlert {
  id: string;
  userId: string;
  backBy: Date;
  contactPhone: string;
  alertAttempts: number;
  startLat: number | null;
  startLng: number | null;
  /** Last location ping (active-trip); listDueAlerts always selects it. */
  lastLat?: number | null;
  lastLng?: number | null;
  user: { username: string; displayName: string | null; locale: LocaleCode };
  place: {
    nameUz: string;
    nameRu: string | null;
    nameEn: string | null;
    latitude: number;
    longitude: number;
  };
}

/** What waypoint check-ins and SOS read for an own trip. `contactPhone` is PhoneCipher ciphertext. */
export interface SafetyTripRecord {
  id: string;
  status: TripStatusCode;
  startedAt: Date | null;
  contactName: string;
  contactPhone: string;
  startLat: number | null;
  startLng: number | null;
  lastLat: number | null;
  lastLng: number | null;
  liveToken: string | null;
  user: { username: string; locale: LocaleCode };
  place: {
    nameUz: string;
    nameRu: string | null;
    nameEn: string | null;
    latitude: number;
    longitude: number;
  };
}

export interface NewWaypoint {
  tripId: string;
  n: number;
  lat: number;
  lng: number;
  accuracyM: number;
  recordedAt: Date;
}

export interface NewSos {
  tripId: string;
  lat: number;
  lng: number;
  sentAt: Date;
  status: 'sent' | 'failed';
}

const tripSelect = {
  id: true,
  status: true,
  startAt: true,
  backBy: true,
  alertEnabled: true,
  contactName: true,
  contactRelation: true,
  contactPhoneLast2: true,
  startedAt: true,
  checkedOutAt: true,
  alertSentAt: true,
  liveToken: true,
  lastLocationAt: true,
  distanceM: true,
  climbM: true,
  waypoints: {
    select: { n: true, lat: true, lng: true, recordedAt: true },
    orderBy: { n: 'asc' },
  },
  place: {
    select: {
      id: true,
      slug: true,
      nameUz: true,
      nameRu: true,
      nameEn: true,
      type: true,
      latitude: true,
      longitude: true,
    },
  },
} as const satisfies Prisma.TripSelect;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class TripPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPreviewPlace(id: string): Promise<PreviewPlace | null> {
    const row = await this.prisma.place.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        latitude: true,
        longitude: true,
        forecast: { select: { daily: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      latitude: row.latitude,
      longitude: row.longitude,
      daily: row.forecast
        ? (row.forecast.daily as unknown as OpenMeteoDaily)
        : null,
    };
  }

  async placeExists(id: string): Promise<boolean> {
    const row = await this.prisma.place.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  findContact(userId: string): Promise<StoredContact | null> {
    return this.prisma.emergencyContact.findUnique({
      where: { userId },
      select: { name: true, relation: true, phone: true, phoneLast2: true },
    });
  }

  async upsertContact(userId: string, contact: StoredContact): Promise<void> {
    await this.prisma.emergencyContact.upsert({
      where: { userId },
      create: { userId, ...contact },
      update: contact,
    });
  }

  async hasActiveTrip(userId: string): Promise<boolean> {
    const row = await this.prisma.trip.findFirst({
      where: { userId, status: 'active' },
      select: { id: true },
    });
    return row !== null;
  }

  /** Throws TRIP_ALREADY_ACTIVE when the one-active-trip index rejects the row. */
  async createTrip(trip: NewTrip): Promise<TripRow> {
    try {
      return await this.prisma.trip.create({
        data: {
          userId: trip.userId,
          placeId: trip.placeId,
          status: trip.status,
          startAt: trip.startAt,
          backBy: trip.backBy,
          alertEnabled: trip.alertEnabled,
          contactName: trip.contact.name,
          contactRelation: trip.contact.relation,
          contactPhone: trip.contact.phone,
          contactPhoneLast2: trip.contact.phoneLast2,
          startedAt: trip.startedAt,
          startLat: trip.location?.lat ?? null,
          startLng: trip.location?.lng ?? null,
          startAccuracyM: trip.location?.accuracyM ?? null,
          liveToken: trip.liveToken,
        },
        select: tripSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new TripAlreadyActiveError();
      throw error;
    }
  }

  findActiveTrip(userId: string): Promise<TripRow | null> {
    return this.prisma.trip.findFirst({
      where: { userId, status: 'active' },
      select: tripSelect,
    });
  }

  /** The user's planned trips starting at or after `since`, earliest first. */
  listPlannedTrips(userId: string, since: Date): Promise<TripRow[]> {
    return this.prisma.trip.findMany({
      where: { userId, status: 'planned', startAt: { gte: since } },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      select: tripSelect,
    });
  }

  findOwnTrip(userId: string, id: string): Promise<TripRow | null> {
    return this.prisma.trip.findFirst({
      where: { id, userId },
      select: tripSelect,
    });
  }

  /**
   * Applies `change` only while `guard` still holds (a conditional update, so a concurrent step
   * cannot be overwritten). Null when the guard no longer matched. Throws TRIP_ALREADY_ACTIVE
   * when the one-active-trip index rejects the row.
   */
  async updateIf(
    id: string,
    guard: TripGuard,
    change: TripChange,
  ): Promise<TripRow | null> {
    const { location, ...fields } = change;
    try {
      const { count } = await this.prisma.trip.updateMany({
        where: {
          id,
          status: { in: guard.statuses },
          ...(guard.alertNotSent ? { alertSentAt: null } : {}),
        },
        data: {
          ...fields,
          ...(location !== undefined
            ? {
                startLat: location?.lat ?? null,
                startLng: location?.lng ?? null,
                startAccuracyM: location?.accuracyM ?? null,
              }
            : {}),
        },
      });
      if (count === 0) return null;
    } catch (error) {
      if (isUniqueViolation(error)) throw new TripAlreadyActiveError();
      throw error;
    }
    return this.prisma.trip.findUnique({ where: { id }, select: tripSelect });
  }

  /** Gives a trip without a live token this one; returns the token the trip has afterwards. */
  async backfillLiveToken(id: string, token: string): Promise<string | null> {
    await this.prisma.trip.updateMany({
      where: { id, liveToken: null },
      data: { liveToken: token },
    });
    const row = await this.prisma.trip.findUnique({
      where: { id },
      select: { liveToken: true },
    });
    return row?.liveToken ?? null;
  }

  /**
   * Stores the ping as the trip's last fix and totals while the trip still takes pings and the
   * fix is not older than the stored one; false when nothing was written.
   */
  async recordPing(
    id: string,
    statuses: TripStatusCode[],
    ping: TripPing,
  ): Promise<boolean> {
    const { count } = await this.prisma.trip.updateMany({
      where: {
        id,
        status: { in: statuses },
        OR: [
          { lastLocationAt: null },
          { lastLocationAt: { lte: ping.recordedAt } },
        ],
      },
      data: {
        lastLat: ping.lat,
        lastLng: ping.lng,
        lastAccuracyM: ping.accuracyM,
        lastLocationAt: ping.recordedAt,
        distanceM: ping.distanceM,
        climbM: ping.climbM,
      },
    });
    return count === 1;
  }

  findLiveTrip(token: string): Promise<LiveTripRecord | null> {
    return this.prisma.trip.findUnique({
      where: { liveToken: token },
      select: {
        status: true,
        backBy: true,
        checkedOutAt: true,
        lastLat: true,
        lastLng: true,
        lastLocationAt: true,
        user: { select: { username: true, displayName: true } },
        place: { select: { nameUz: true, nameRu: true, nameEn: true } },
      },
    });
  }

  findSafetyTrip(userId: string, id: string): Promise<SafetyTripRecord | null> {
    return this.prisma.trip.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        contactName: true,
        contactPhone: true,
        startLat: true,
        startLng: true,
        lastLat: true,
        lastLng: true,
        liveToken: true,
        user: { select: { username: true, locale: true } },
        place: {
          select: {
            nameUz: true,
            nameRu: true,
            nameEn: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
  }

  listWaypoints(tripId: string): Promise<TripWaypointRecord[]> {
    return this.prisma.tripWaypoint.findMany({
      where: { tripId },
      orderBy: { n: 'asc' },
      select: { n: true, lat: true, lng: true, recordedAt: true },
    });
  }

  /** Inserts waypoint n; null when another request took that n first (unique (tripId, n)). */
  async insertWaypoint(waypoint: NewWaypoint): Promise<{ id: string } | null> {
    try {
      return await this.prisma.tripWaypoint.create({
        data: { ...waypoint, xpAwarded: 0 },
        select: { id: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async setWaypointXp(id: string, xpAwarded: number): Promise<void> {
    await this.prisma.tripWaypoint.update({
      where: { id },
      data: { xpAwarded },
    });
  }

  /** Last SOS that reached the contact; failed attempts never start a cooldown. */
  async lastSosAt(tripId: string): Promise<Date | null> {
    const row = await this.prisma.tripSos.findFirst({
      where: { tripId, status: 'sent' },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });
    return row?.sentAt ?? null;
  }

  async insertSos(sos: NewSos): Promise<void> {
    await this.prisma.tripSos.create({ data: sos });
  }

  /** Deletes the trip only while it is planned; false when it was not. */
  async deletePlanned(id: string): Promise<boolean> {
    const { count } = await this.prisma.trip.deleteMany({
      where: { id, status: 'planned' },
    });
    return count > 0;
  }

  /** AC8: active, alert on, not yet alerted, under the retry cap, with backBy at or before `dueBefore`. */
  listDueAlerts(dueBefore: Date): Promise<DueAlert[]> {
    return this.prisma.trip.findMany({
      where: {
        status: 'active',
        alertEnabled: true,
        alertSentAt: null,
        alertAttempts: { lt: ALERT_MAX_ATTEMPTS },
        backBy: { lte: dueBefore },
      },
      orderBy: [{ backBy: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        userId: true,
        backBy: true,
        contactPhone: true,
        alertAttempts: true,
        startLat: true,
        startLng: true,
        lastLat: true,
        lastLng: true,
        user: { select: { username: true, displayName: true, locale: true } },
        place: {
          select: {
            nameUz: true,
            nameRu: true,
            nameEn: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });
  }

  /** Claims the alert by stamping alertSentAt; true only for the one caller whose update matched. */
  async claimAlert(id: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.trip.updateMany({
      where: {
        id,
        status: 'active',
        alertEnabled: true,
        alertSentAt: null,
        alertAttempts: { lt: ALERT_MAX_ATTEMPTS },
      },
      data: { alertSentAt: at },
    });
    return count === 1;
  }

  /** The SMS went out: active → alerted (a check-out that raced the send keeps checked_out). */
  async markAlerted(id: string): Promise<void> {
    await this.prisma.trip.updateMany({
      where: { id, status: 'active' },
      data: { status: 'alerted' },
    });
  }

  /** The send failed: release the claim and count the attempt so the next tick may retry. */
  async releaseAlert(id: string, claimedAt: Date): Promise<void> {
    await this.prisma.trip.updateMany({
      where: { id, alertSentAt: claimedAt },
      data: { alertSentAt: null, alertAttempts: { increment: 1 } },
    });
  }
}

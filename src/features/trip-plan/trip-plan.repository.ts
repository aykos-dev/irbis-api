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
  user: { username: string; displayName: string | null; locale: LocaleCode };
  place: {
    nameUz: string;
    nameRu: string | null;
    nameEn: string | null;
    latitude: number;
    longitude: number;
  };
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
  async createTrip(trip: NewTrip): Promise<TripRecord> {
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
        },
        select: tripSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new TripAlreadyActiveError();
      throw error;
    }
  }

  findActiveTrip(userId: string): Promise<TripRecord | null> {
    return this.prisma.trip.findFirst({
      where: { userId, status: 'active' },
      select: tripSelect,
    });
  }

  /** The user's planned trips starting at or after `since`, earliest first. */
  listPlannedTrips(userId: string, since: Date): Promise<TripRecord[]> {
    return this.prisma.trip.findMany({
      where: { userId, status: 'planned', startAt: { gte: since } },
      orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      select: tripSelect,
    });
  }

  findOwnTrip(userId: string, id: string): Promise<TripRecord | null> {
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
  ): Promise<TripRecord | null> {
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

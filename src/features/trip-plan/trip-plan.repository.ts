import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { OpenMeteoDaily } from '../conditions/condition.rules.js';
import type { PlaceTypeCode } from '../places/places.constants.js';
import { TripAlreadyActiveError } from './trip-plan.errors.js';
import type { TripStatusCode } from './trip-plan.constants.js';

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
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PlaceTypeCode } from '../places/places.constants.js';

export interface CheckInRecord {
  id: string;
  placeId: string;
  recordedAt: Date;
  counted: boolean;
  xpAwarded: number;
  pathVisited: boolean;
}

export interface CheckInPlaceRecord {
  id: string;
  type: PlaceTypeCode;
  latitude: number;
  longitude: number;
  difficulty: number;
}

export interface NewCheckIn {
  userId: string;
  placeId: string;
  clientId: string;
  lat: number;
  lng: number;
  accuracyM: number;
  recordedAt: Date;
  month: string;
}

const RECORD_SELECT = {
  id: true,
  placeId: true,
  recordedAt: true,
  counted: true,
  xpAwarded: true,
  pathVisited: true,
} as const;

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class CheckInRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByClientId(
    userId: string,
    clientId: string,
  ): Promise<CheckInRecord | null> {
    return this.prisma.checkIn.findUnique({
      where: { userId_clientId: { userId, clientId } },
      select: RECORD_SELECT,
    });
  }

  findPlace(id: string): Promise<CheckInPlaceRecord | null> {
    return this.prisma.place.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        latitude: true,
        longitude: true,
        difficulty: true,
      },
    });
  }

  /**
   * Inserts the check-in, counted when the user has no counted one for this place and month yet.
   * Null when a unique key collided (same clientId, or a concurrent counted insert): the caller
   * re-reads and retries.
   */
  async insert(checkIn: NewCheckIn): Promise<CheckInRecord | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const countedBefore = await tx.checkIn.findFirst({
          where: {
            userId: checkIn.userId,
            placeId: checkIn.placeId,
            month: checkIn.month,
            counted: true,
          },
          select: { id: true },
        });
        return tx.checkIn.create({
          data: { ...checkIn, counted: countedBefore === null },
          select: RECORD_SELECT,
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async setOutcome(
    id: string,
    outcome: { xpAwarded: number; pathVisited: boolean },
  ): Promise<void> {
    await this.prisma.checkIn.update({ where: { id }, data: outcome });
  }
}

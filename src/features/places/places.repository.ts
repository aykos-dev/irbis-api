import { Injectable } from '@nestjs/common';
import type { ConditionStatus, Place } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PlaceTypeCode } from './places.constants.js';

export interface PlaceFilter {
  types?: PlaceTypeCode[];
  difficultyMin?: number;
  difficultyMax?: number;
}

/** `condition` is loaded by `findCandidates` only: null when no condition was computed yet. */
export type PlaceRow = Place & {
  condition?: { status: ConditionStatus | null } | null;
};

@Injectable()
export class PlacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Places matching type (any of) and difficulty (inclusive). Distance is applied by the caller. */
  findCandidates(filter: PlaceFilter): Promise<PlaceRow[]> {
    return this.prisma.place.findMany({
      where: {
        ...(filter.types?.length ? { type: { in: filter.types } } : {}),
        difficulty: { gte: filter.difficultyMin, lte: filter.difficultyMax },
      },
      include: { condition: { select: { status: true } } },
    });
  }

  findById(id: string): Promise<PlaceRow | null> {
    return this.prisma.place.findUnique({ where: { id } });
  }
}

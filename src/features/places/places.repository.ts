import { Injectable } from '@nestjs/common';
import type { Place } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PlaceTypeCode } from './places.constants.js';

export interface PlaceFilter {
  types?: PlaceTypeCode[];
  difficultyMin?: number;
  difficultyMax?: number;
}

export type PlaceRow = Place;

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
    });
  }

  findById(id: string): Promise<PlaceRow | null> {
    return this.prisma.place.findUnique({ where: { id } });
  }
}

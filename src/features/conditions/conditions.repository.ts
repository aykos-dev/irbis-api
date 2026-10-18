import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  HazardCode,
  SeasonStatusCode,
} from '../places/places.constants.js';
import type { OpenMeteoDaily } from './condition.rules.js';
import type {
  ConditionSourceCode,
  ConditionStatusCode,
  HazardLevel,
  Reason,
  WeekendDay,
} from './conditions.constants.js';

export interface PlaceCoordinates {
  id: string;
  latitude: number;
  longitude: number;
}

export interface ForecastRow {
  placeId: string;
  daily: OpenMeteoDaily;
  fetchedAt: Date;
}

/** Everything the precedence + rules need for one place, as of `now`. */
export interface ConditionInput {
  placeId: string;
  season: SeasonStatusCode[];
  hazards: HazardCode[];
  forecast: { daily: OpenMeteoDaily; fetchedAt: Date } | null;
  activeOverride: { id: string; status: ConditionStatusCode } | null;
  activeClosure: { id: string } | null;
}

export interface ConditionRow {
  placeId: string;
  status: ConditionStatusCode | null;
  source: ConditionSourceCode | null;
  reasons: Reason[];
  hazardLevels: HazardLevel[];
  weekend: WeekendDay[];
  forecastAt: Date | null;
  computedAt: Date;
}

const json = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

@Injectable()
export class ConditionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCoordinates(): Promise<PlaceCoordinates[]> {
    return this.prisma.place.findMany({
      select: { id: true, latitude: true, longitude: true },
      orderBy: { id: 'asc' },
    });
  }

  async saveForecasts(rows: readonly ForecastRow[]): Promise<void> {
    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.placeForecast.upsert({
          where: { placeId: row.placeId },
          create: {
            placeId: row.placeId,
            daily: json(row.daily),
            fetchedAt: row.fetchedAt,
          },
          update: { daily: json(row.daily), fetchedAt: row.fetchedAt },
        }),
      ),
    );
  }

  /** Inputs for one place (`placeId`) or for every place, with closures/overrides active at `now`. */
  async findInputs(now: Date, placeId?: string): Promise<ConditionInput[]> {
    const places = await this.prisma.place.findMany({
      where: placeId ? { id: placeId } : {},
      orderBy: { id: 'asc' },
      select: {
        id: true,
        season: true,
        hazards: true,
        forecast: { select: { daily: true, fetchedAt: true } },
        overrides: {
          where: { endedAt: null, expiresAt: { gt: now } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true },
        },
        closures: {
          where: {
            endedAt: null,
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });
    return places.map((place) => ({
      placeId: place.id,
      season: place.season,
      hazards: place.hazards,
      forecast: place.forecast
        ? {
            daily: place.forecast.daily as unknown as OpenMeteoDaily,
            fetchedAt: place.forecast.fetchedAt,
          }
        : null,
      activeOverride: place.overrides[0] ?? null,
      activeClosure: place.closures[0] ?? null,
    }));
  }

  async saveConditions(rows: readonly ConditionRow[]): Promise<void> {
    await this.prisma.$transaction(
      rows.map((row) => {
        const data = {
          status: row.status,
          source: row.source,
          reasons: json(row.reasons),
          hazardLevels: json(row.hazardLevels),
          weekend: json(row.weekend),
          forecastAt: row.forecastAt,
          computedAt: row.computedAt,
        };
        return this.prisma.placeCondition.upsert({
          where: { placeId: row.placeId },
          create: { placeId: row.placeId, ...data },
          update: data,
        });
      }),
    );
  }
}

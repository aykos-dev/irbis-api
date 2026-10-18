import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  HazardCode,
  SeasonStatusCode,
} from '../places/places.constants.js';
import type { PlaceTypeCode } from '../places/places.constants.js';
import type { OpenMeteoDaily } from './condition.rules.js';
import type {
  AdminStatusFilter,
  ClosureSourceCode,
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

export interface LocalizedText {
  uz: string;
  ru: string | null;
  en: string | null;
}

/** A place's stored condition plus what the read side needs to explain it. */
export interface PlaceConditionView {
  placeId: string;
  season: SeasonStatusCode[];
  condition: Omit<ConditionRow, 'placeId'> | null;
  activeOverrideReason: LocalizedText | null;
  activeClosureReason: LocalizedText | null;
}

export interface ClosureRecord {
  id: string;
  placeId: string;
  startsAt: Date;
  endsAt: Date | null;
  reason: LocalizedText;
  source: ClosureSourceCode;
  createdAt: Date;
  endedAt: Date | null;
}

export interface OverrideRecord {
  id: string;
  placeId: string;
  status: ConditionStatusCode;
  reason: LocalizedText;
  expiresAt: Date;
  createdAt: Date;
  endedAt: Date | null;
}

export interface NewClosure {
  placeId: string;
  startsAt: Date;
  endsAt: Date | null;
  reason: LocalizedText;
  source: ClosureSourceCode;
  createdById: string;
}

export interface NewOverride {
  placeId: string;
  status: ConditionStatusCode;
  reason: LocalizedText;
  expiresAt: Date;
  createdById: string;
}

export interface AdminConditionRecord {
  placeId: string;
  slug: string;
  name: LocalizedText;
  type: PlaceTypeCode;
  status: ConditionStatusCode | null;
  source: ConditionSourceCode | null;
  computedAt: Date | null;
  forecastAt: Date | null;
  activeClosureId: string | null;
  activeOverrideId: string | null;
}

export interface AdminConditionFilter {
  status?: AdminStatusFilter;
  /** Keyset: rows after this (nameUz, id). */
  after: { nameUz: string; id: string } | null;
  limit: number;
  now: Date;
}

const json = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const activeOverrideWhere = (
  now: Date,
): Prisma.ConditionOverrideWhereInput => ({
  endedAt: null,
  expiresAt: { gt: now },
});

const activeClosureWhere = (now: Date): Prisma.ClosureWhereInput => ({
  endedAt: null,
  startsAt: { lte: now },
  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
});

const REASON_SELECT = {
  reasonUz: true,
  reasonRu: true,
  reasonEn: true,
} as const;

const text = (row: {
  reasonUz: string;
  reasonRu: string | null;
  reasonEn: string | null;
}): LocalizedText => ({ uz: row.reasonUz, ru: row.reasonRu, en: row.reasonEn });

const CLOSURE_SELECT = {
  id: true,
  placeId: true,
  startsAt: true,
  endsAt: true,
  ...REASON_SELECT,
  source: true,
  createdAt: true,
  endedAt: true,
} as const;

const OVERRIDE_SELECT = {
  id: true,
  placeId: true,
  status: true,
  ...REASON_SELECT,
  expiresAt: true,
  createdAt: true,
  endedAt: true,
} as const;

type ClosureSelected = Prisma.ClosureGetPayload<{
  select: typeof CLOSURE_SELECT;
}>;
type OverrideSelected = Prisma.ConditionOverrideGetPayload<{
  select: typeof OVERRIDE_SELECT;
}>;

const toClosure = (row: ClosureSelected): ClosureRecord => ({
  id: row.id,
  placeId: row.placeId,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  reason: text(row),
  source: row.source,
  createdAt: row.createdAt,
  endedAt: row.endedAt,
});

const toOverride = (row: OverrideSelected): OverrideRecord => ({
  id: row.id,
  placeId: row.placeId,
  status: row.status,
  reason: text(row),
  expiresAt: row.expiresAt,
  createdAt: row.createdAt,
  endedAt: row.endedAt,
});

const adminStatusWhere = (
  status: AdminStatusFilter | undefined,
): Prisma.PlaceWhereInput => {
  if (status === undefined) return {};
  if (status === 'none') {
    return { OR: [{ condition: null }, { condition: { status: null } }] };
  }
  return { condition: { status } };
};

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
          where: activeOverrideWhere(now),
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true },
        },
        closures: {
          where: activeClosureWhere(now),
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

  async findConditionView(
    placeId: string,
    now: Date,
  ): Promise<PlaceConditionView | null> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        season: true,
        condition: true,
        overrides: {
          where: activeOverrideWhere(now),
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: REASON_SELECT,
        },
        closures: {
          where: activeClosureWhere(now),
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: REASON_SELECT,
        },
      },
    });
    if (!place) return null;
    const c = place.condition;
    return {
      placeId: place.id,
      season: place.season,
      condition: c
        ? {
            status: c.status,
            source: c.source,
            reasons: c.reasons as unknown as Reason[],
            hazardLevels: c.hazardLevels as unknown as HazardLevel[],
            weekend: c.weekend as unknown as WeekendDay[],
            forecastAt: c.forecastAt,
            computedAt: c.computedAt,
          }
        : null,
      activeOverrideReason: place.overrides[0]
        ? text(place.overrides[0])
        : null,
      activeClosureReason: place.closures[0] ? text(place.closures[0]) : null,
    };
  }

  /** Places with their condition, by name (uz) then id. `total` ignores the cursor. */
  async listAdmin(
    filter: AdminConditionFilter,
  ): Promise<{ rows: AdminConditionRecord[]; total: number }> {
    const where = adminStatusWhere(filter.status);
    const after = filter.after;
    const page: Prisma.PlaceWhereInput = after
      ? {
          AND: [
            where,
            {
              OR: [
                { nameUz: { gt: after.nameUz } },
                { nameUz: after.nameUz, id: { gt: after.id } },
              ],
            },
          ],
        }
      : where;
    const [places, total] = await Promise.all([
      this.prisma.place.findMany({
        where: page,
        orderBy: [{ nameUz: 'asc' }, { id: 'asc' }],
        take: filter.limit,
        select: {
          id: true,
          slug: true,
          nameUz: true,
          nameRu: true,
          nameEn: true,
          type: true,
          condition: {
            select: {
              status: true,
              source: true,
              computedAt: true,
              forecastAt: true,
            },
          },
          closures: {
            where: activeClosureWhere(filter.now),
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
          overrides: {
            where: activeOverrideWhere(filter.now),
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      }),
      this.prisma.place.count({ where }),
    ]);
    return {
      total,
      rows: places.map((p) => ({
        placeId: p.id,
        slug: p.slug,
        name: { uz: p.nameUz, ru: p.nameRu, en: p.nameEn },
        type: p.type,
        status: p.condition?.status ?? null,
        source: p.condition?.source ?? null,
        computedAt: p.condition?.computedAt ?? null,
        forecastAt: p.condition?.forecastAt ?? null,
        activeClosureId: p.closures[0]?.id ?? null,
        activeOverrideId: p.overrides[0]?.id ?? null,
      })),
    };
  }

  async placeExists(placeId: string): Promise<boolean> {
    const row = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true },
    });
    return row !== null;
  }

  /** Every closure and override of a place, newest first. */
  async listControls(
    placeId: string,
  ): Promise<{ closures: ClosureRecord[]; overrides: OverrideRecord[] }> {
    const [closures, overrides] = await Promise.all([
      this.prisma.closure.findMany({
        where: { placeId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: CLOSURE_SELECT,
      }),
      this.prisma.conditionOverride.findMany({
        where: { placeId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: OVERRIDE_SELECT,
      }),
    ]);
    return {
      closures: closures.map(toClosure),
      overrides: overrides.map(toOverride),
    };
  }

  async createClosure(data: NewClosure): Promise<ClosureRecord> {
    const row = await this.prisma.closure.create({
      data: {
        placeId: data.placeId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        reasonUz: data.reason.uz,
        reasonRu: data.reason.ru,
        reasonEn: data.reason.en,
        source: data.source,
        createdById: data.createdById,
      },
      select: CLOSURE_SELECT,
    });
    return toClosure(row);
  }

  async findClosure(id: string): Promise<ClosureRecord | null> {
    const row = await this.prisma.closure.findUnique({
      where: { id },
      select: CLOSURE_SELECT,
    });
    return row ? toClosure(row) : null;
  }

  /** Ends a closure that has not been ended yet. Null when it already was (or does not exist). */
  async endClosure(
    id: string,
    endedById: string,
    now: Date,
  ): Promise<ClosureRecord | null> {
    const { count } = await this.prisma.closure.updateMany({
      where: { id, endedAt: null },
      data: { endedAt: now, endedById },
    });
    return count === 1 ? this.findClosure(id) : null;
  }

  /** Ends the place's active overrides, then creates the new one, in one transaction. */
  async replaceOverride(data: NewOverride, now: Date): Promise<OverrideRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.conditionOverride.updateMany({
        where: { placeId: data.placeId, ...activeOverrideWhere(now) },
        data: { endedAt: now, endedById: data.createdById },
      });
      return tx.conditionOverride.create({
        data: {
          placeId: data.placeId,
          status: data.status,
          reasonUz: data.reason.uz,
          reasonRu: data.reason.ru,
          reasonEn: data.reason.en,
          expiresAt: data.expiresAt,
          createdById: data.createdById,
        },
        select: OVERRIDE_SELECT,
      });
    });
    return toOverride(row);
  }

  async findOverride(id: string): Promise<OverrideRecord | null> {
    const row = await this.prisma.conditionOverride.findUnique({
      where: { id },
      select: OVERRIDE_SELECT,
    });
    return row ? toOverride(row) : null;
  }

  /** Ends an override that has not been ended yet. Null when it already was (or does not exist). */
  async endOverride(
    id: string,
    endedById: string,
    now: Date,
  ): Promise<OverrideRecord | null> {
    const { count } = await this.prisma.conditionOverride.updateMany({
      where: { id, endedAt: null },
      data: { endedAt: now, endedById },
    });
    return count === 1 ? this.findOverride(id) : null;
  }
}

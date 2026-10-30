import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { AppConfig } from '../../config/app-config.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import type {
  PlaceOriginQueryDto,
  PlacesQueryDto,
} from './dto/places.request.dto.js';
import type {
  PlaceDetailDto,
  PlaceListItemDto,
  PlaceListResponseDto,
} from './dto/places.response.dto.js';
import { haversineM, type LatLng, rankByDistance } from './place.rules.js';
import {
  GUEST_LEVEL,
  PLACES_DEFAULT_LIMIT,
  type PlaceOrigin,
} from './places.constants.js';
import { PlaceNotFoundError } from './places.errors.js';
import { PlacesRepository, type PlaceRow } from './places.repository.js';

@Injectable()
export class PlacesService {
  constructor(
    private readonly places: PlacesRepository,
    private readonly config: AppConfig,
  ) {}

  async list(query: PlacesQueryDto): Promise<PlaceListResponseDto> {
    const offset = parseOffsetCursor(query.cursor);
    const limit = query.limit ?? PLACES_DEFAULT_LIMIT;
    const { origin, point } = this.resolveOrigin(query);
    const candidates = await this.places.findCandidates({
      types: query.types,
      difficultyMin: query.difficultyMin,
      difficultyMax: query.difficultyMax,
    });
    const ranked = rankByDistance(candidates, point, query.maxDistanceKm);
    const page = ranked.slice(offset, offset + limit);
    const next = offset + limit;
    return {
      items: page.map((row) => ({
        ...toListItem(row, row.distanceM),
        ...conditionStatusOf(row),
      })),
      nextCursor: next < ranked.length ? encodeCursor({ offset: next }) : null,
      origin,
      total: ranked.length,
    };
  }

  /**
   * Free-text place search for the Search screen: name, slug or region contains `query`.
   * Name matches that start with the term come first, then the rest by name.
   */
  async search(
    query: string,
    point: LatLng,
    limit: number,
  ): Promise<PlaceListItemDto[]> {
    const term = query.trim().toLowerCase();
    if (term.length === 0) return [];
    const rows = await this.places.searchByName(term, limit * 5);
    const ranked = rows
      .map((row) => ({
        row,
        distanceM: haversineM(point, {
          lat: row.latitude,
          lng: row.longitude,
        }),
        starts:
          [
            row.nameUz,
            row.nameRu ?? '',
            row.nameEn ?? '',
            row.slug,
          ]
            .map((name) => name.toLowerCase())
            .some((name) => name.startsWith(term)) ? 0 : 1,
      }))
      .sort(
        (a, b) =>
          a.starts - b.starts ||
          (a.row.nameEn ?? a.row.nameUz).localeCompare(
            b.row.nameEn ?? b.row.nameUz,
          ) ||
          a.row.id.localeCompare(b.row.id),
      )
      .slice(0, limit);
    return ranked.map(({ row, distanceM }) => ({
      ...toListItem(row, distanceM),
      ...conditionStatusOf(row),
    }));
  }

  /** `viewerId` is the signed-in caller, if any; guests see level 1. */
  async detail(    id: string,
    query: PlaceOriginQueryDto,
    viewerId?: string,
  ): Promise<Omit<PlaceDetailDto, 'checkInRadiusM'>> {
    const row = await this.places.findById(id);
    if (!row) throw new PlaceNotFoundError();
    const { origin, point } = this.resolveOrigin(query);
    const distanceM = haversineM(point, {
      lat: row.latitude,
      lng: row.longitude,
    });
    const level =
      (viewerId ? await this.places.findViewerLevel(viewerId) : null) ??
      GUEST_LEVEL;
    return {
      ...toListItem(row, distanceM),
      region: row.region,
      description: {
        uz: row.descriptionUz,
        ru: row.descriptionRu,
        en: row.descriptionEn,
      },
      season: row.season,
      hazards: row.hazards,
      origin,
      viewer: { level, qualifies: row.requiredLevel <= level },
    };
  }

  private resolveOrigin(query: PlaceOriginQueryDto): {
    origin: PlaceOrigin;
    point: LatLng;
  } {
    if (query.lat !== undefined && query.lng !== undefined) {
      return { origin: 'device', point: { lat: query.lat, lng: query.lng } };
    }
    return { origin: 'tashkent', point: this.config.placesFallbackOrigin };
  }
}

/** Present once a condition was computed for the place (its status may still be null). */
function conditionStatusOf(
  row: PlaceRow,
): Pick<PlaceListItemDto, 'conditionStatus'> {
  return row.condition ? { conditionStatus: row.condition.status } : {};
}

function toListItem(
  row: PlaceRow,
  distanceM: number,
): Omit<PlaceListItemDto, 'conditionStatus'> {
  return {
    id: row.id,
    slug: row.slug,
    name: { uz: row.nameUz, ru: row.nameRu, en: row.nameEn },
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    elevationM: row.elevationM,
    difficulty: row.difficulty,
    requiredLevel: row.requiredLevel,
    distanceM,
  };
}

function parseOffsetCursor(raw: string | undefined): number {
  if (!raw) return 0;
  const offset = decodeCursor(raw)?.offset;
  if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) {
    throw new RequestValidationError({ cursor: ['invalid'] });
  }
  return offset;
}

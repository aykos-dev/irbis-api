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
import { PLACES_DEFAULT_LIMIT, type PlaceOrigin } from './places.constants.js';
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

  async detail(
    id: string,
    query: PlaceOriginQueryDto,
  ): Promise<PlaceDetailDto> {
    const row = await this.places.findById(id);
    if (!row) throw new PlaceNotFoundError();
    const { origin, point } = this.resolveOrigin(query);
    const distanceM = haversineM(point, {
      lat: row.latitude,
      lng: row.longitude,
    });
    const level = this.config.levelsStartLevel;
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

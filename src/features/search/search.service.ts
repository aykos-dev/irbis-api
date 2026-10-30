import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import { PlacesService } from '../places/places.service.js';
import type { SearchQueryDto } from './dto/search.request.dto.js';
import type { SearchResultsDto } from './dto/search.response.dto.js';
import { SEARCH_LIMIT, SEARCH_MIN_QUERY } from './search.constants.js';
import { SearchRepository } from './search.repository.js';

/** One query across places and people; groups and tours answer empty until they ship. */
@Injectable()
export class SearchService {
  constructor(
    private readonly places: PlacesService,
    private readonly repository: SearchRepository,
    private readonly storage: StorageService,
    private readonly config: AppConfig,
  ) {}

  async search(
    query: SearchQueryDto,
    viewerId?: string,
  ): Promise<SearchResultsDto> {
    const term = query.q.trim();
    // Trimming can push a valid-length raw query below the minimum.
    if (term.length < SEARCH_MIN_QUERY) {
      return { places: [], people: [], groups: [], tours: [] };
    }
    const scope = query.scope ?? 'all';
    const point =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : this.config.placesFallbackOrigin;
    const wantPlaces = scope === 'all' || scope === 'places';
    const wantPeople = scope === 'all' || scope === 'people';
    const [places, people] = await Promise.all([
      wantPlaces
        ? this.places.search(term, point, SEARCH_LIMIT)
        : Promise.resolve([]),
      wantPeople
        ? this.repository.findPeople(term, viewerId, SEARCH_LIMIT)
        : Promise.resolve([]),
    ]);
    return {
      places,
      people: people.map((row) => ({
        username: row.username,
        displayName: row.displayName,
        avatarUrl: this.avatarUrl(row.avatarKey),
        level: row.level,
      })),
      groups: [],
      tours: [],
    };
  }

  /** Storage being down must not fail search: the app falls back to initials. */
  private avatarUrl(key: string | null): string | null {
    if (key === null) return null;
    try {
      return this.storage.publicUrl(key);
    } catch (error) {
      if (error instanceof StorageUnavailableError) return null;
      throw error;
    }
  }
}

import { Injectable, Optional } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import { PlacesService } from '../places/places.service.js';
import { GroupsService } from '../groups/groups.service.js';
import { TripEventsService } from '../trip-events/trip-events.service.js';
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
    private readonly groups: GroupsService,
    @Optional() private readonly trips?: TripEventsService,
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
    const wantGroups = scope === 'all' || scope === 'groups';
    const wantTrips = scope === 'all' || scope === 'trips';
    const [places, people, groups, trips] = await Promise.all([
      wantPlaces
        ? this.places.search(term, point, SEARCH_LIMIT)
        : Promise.resolve([]),
      wantPeople
        ? this.repository.findPeople(term, viewerId, SEARCH_LIMIT)
        : Promise.resolve([]),
      wantGroups
        ? this.groups.searchPublic(term, SEARCH_LIMIT)
        : Promise.resolve([]),
      wantTrips && this.trips
        ? this.trips.search(term, SEARCH_LIMIT)
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
      groups: groups.map((group) => ({
        id: group.id,
        slug: group.slug,
        name: group.name,
        description: group.description,
        avatarUrl: group.avatarUrl,
        color: group.color,
        memberCount: group.memberCount,
      })),
      tours: [],
      ...(wantTrips ? { trips } : {}),
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

import { Module } from '@nestjs/common';
import { StorageModule } from '../../lib/storage/storage.module.js';
import { PlacesModule } from '../places/places.module.js';
import { GroupsModule } from '../groups/groups.module.js';
import { TripEventsModule } from '../trip-events/trip-events.module.js';
import { SearchController } from './search.controller.js';
import { SearchRepository } from './search.repository.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [PlacesModule, StorageModule, GroupsModule, TripEventsModule],
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
})
export class SearchModule {}

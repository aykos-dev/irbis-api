import { Module } from '@nestjs/common';
import { StorageModule } from '../../lib/storage/storage.module.js';
import {
  BuddiesController,
  BuddiesMeController,
  TripRatingsController,
} from './buddies.controller.js';
import { BuddiesRepository } from './buddies.repository.js';
import { BuddiesService } from './buddies.service.js';

@Module({
  imports: [StorageModule],
  controllers: [BuddiesController, BuddiesMeController, TripRatingsController],
  providers: [BuddiesRepository, BuddiesService],
  exports: [BuddiesService],
})
export class BuddiesModule {}

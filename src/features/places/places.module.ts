import { Module } from '@nestjs/common';
import { LevelsModule } from '../levels/levels.module.js';
import { PlacesController } from './places.controller.js';
import { PlacesRepository } from './places.repository.js';
import { PlacesService } from './places.service.js';

@Module({
  imports: [LevelsModule],
  controllers: [PlacesController],
  providers: [PlacesService, PlacesRepository],
  exports: [PlacesService],
})
export class PlacesModule {}

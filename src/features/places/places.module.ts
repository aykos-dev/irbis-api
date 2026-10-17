import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller.js';
import { PlacesRepository } from './places.repository.js';
import { PlacesService } from './places.service.js';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, PlacesRepository],
})
export class PlacesModule {}

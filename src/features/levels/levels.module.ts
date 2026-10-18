import { Module } from '@nestjs/common';
import { GameConfigService } from './game-config.service.js';
import { LevelsRepository } from './levels.repository.js';
import { LevelsService } from './levels.service.js';

@Module({
  providers: [LevelsService, LevelsRepository, GameConfigService],
  exports: [LevelsService],
})
export class LevelsModule {}

import { Module } from '@nestjs/common';
import { GameConfigService } from './game-config.service.js';
import { LevelsController, MeLevelController } from './levels.controller.js';
import { LevelsRepository } from './levels.repository.js';
import { LevelsService } from './levels.service.js';
import { QaGrantController } from './qa-grant.controller.js';
import { QaToolsGuard } from './qa-tools.guard.js';

@Module({
  controllers: [LevelsController, MeLevelController, QaGrantController],
  providers: [LevelsService, LevelsRepository, GameConfigService, QaToolsGuard],
  exports: [LevelsService, GameConfigService],
})
export class LevelsModule {}

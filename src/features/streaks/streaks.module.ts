import { Module } from '@nestjs/common';
import { LevelsModule } from '../levels/levels.module.js';
import { MeStreaksController } from './streaks.controller.js';
import { StreaksRepository } from './streaks.repository.js';
import { StreaksService } from './streaks.service.js';

@Module({
  imports: [LevelsModule],
  controllers: [MeStreaksController],
  providers: [StreaksService, StreaksRepository],
  exports: [StreaksService],
})
export class StreaksModule {}

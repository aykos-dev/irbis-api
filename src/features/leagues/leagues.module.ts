import { Module } from '@nestjs/common';
import { StorageModule } from '../../lib/storage/storage.module.js';
import { LeaguesController } from './leagues.controller.js';
import { LeaguesJob } from './leagues.job.js';
import { LeaguesRepository } from './leagues.repository.js';
import { LeaguesService } from './leagues.service.js';

@Module({
  imports: [StorageModule],
  controllers: [LeaguesController],
  providers: [LeaguesRepository, LeaguesService, LeaguesJob],
  exports: [LeaguesService],
})
export class LeaguesModule {}

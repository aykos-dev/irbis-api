import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeaguesService } from './leagues.service.js';

@Injectable()
export class LeaguesJob {
  private readonly logger = new Logger(LeaguesJob.name);
  private running = false;

  constructor(private readonly leagues: LeaguesService) {}

  @Cron('0 5 * * * *', { name: 'league-rollover', timeZone: 'Asia/Tashkent' })
  async handleCron(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const finalized = await this.leagues.finalizeDue();
      if (finalized > 0)
        this.logger.log(
          { event: 'LEAGUES_FINALIZED', finalized },
          'LEAGUES_FINALIZED',
        );
    } catch (error: unknown) {
      this.logger.error(
        { err: error, event: 'LEAGUES_FINALIZE_FAILED' },
        'LEAGUES_FINALIZE_FAILED',
      );
    } finally {
      this.running = false;
    }
  }
}

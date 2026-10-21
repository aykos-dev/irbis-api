import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { addMs } from '../../lib/dates.js';
import { PhoneCipher } from '../auth/phone-cipher.js';
import { SmsSender } from '../auth/sms-sender.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { tripAlertText } from './trip-alert.sms.js';
import { TripPlanRepository, type DueAlert } from './trip-plan.repository.js';

const MINUTE_MS = 60_000;

export interface TripAlertRunSummary {
  sent: number;
  failed: number;
}

/** AC8: every minute, texts the emergency contact of overdue active trips. Overlapping runs are skipped in-process. */
@Injectable()
export class TripAlertJob {
  private readonly logger = new Logger(TripAlertJob.name);
  private running = false;

  constructor(
    private readonly repository: TripPlanRepository,
    private readonly gameConfig: GameConfigService,
    private readonly phoneCipher: PhoneCipher,
    private readonly sms: SmsSender,
  ) {}

  /** Sends due alerts; null (and nothing done) when a run is already in progress. */
  async runNow(now = new Date()): Promise<TripAlertRunSummary | null> {
    if (this.running) return null;
    this.running = true;
    try {
      const config = await this.gameConfig.tripConfig(now.getTime());
      const due = await this.repository.listDueAlerts(
        addMs(now, -config.alertDelayMin * MINUTE_MS),
      );
      const summary: TripAlertRunSummary = { sent: 0, failed: 0 };
      for (const alert of due) {
        const outcome = await this.alertOne(alert, now);
        if (outcome === 'sent') summary.sent += 1;
        if (outcome === 'failed') summary.failed += 1;
      }
      return summary;
    } finally {
      this.running = false;
    }
  }

  /**
   * Claim-then-send: alertSentAt is stamped by a conditional update before the SMS goes out, so a
   * second tick, an overlapping instance or a restart can never send it again. A failed send
   * releases the claim and counts the attempt; a crash mid-send leaves it claimed (at most once).
   */
  private async alertOne(
    alert: DueAlert,
    now: Date,
  ): Promise<'sent' | 'failed' | 'skipped'> {
    if (!(await this.repository.claimAlert(alert.id, now))) return 'skipped';
    try {
      await this.sms.sendText({
        userId: alert.userId,
        phone: this.phoneCipher.decrypt(alert.contactPhone),
        text: tripAlertText(alert),
      });
    } catch {
      // The provider error may echo the phone or text: log only the trip and attempt number.
      await this.repository.releaseAlert(alert.id, now);
      this.logger.warn(
        {
          event: 'TRIP_ALERT_FAILED',
          tripId: alert.id,
          attempt: alert.alertAttempts + 1,
        },
        'TRIP_ALERT_FAILED',
      );
      return 'failed';
    }
    await this.repository.markAlerted(alert.id);
    return 'sent';
  }

  @Cron('0 * * * * *', { name: 'trip-alert', timeZone: 'Asia/Tashkent' })
  async handleCron(): Promise<void> {
    try {
      const summary = await this.runNow();
      if (!summary) {
        this.logger.warn(
          { event: 'TRIP_ALERT_RUN_SKIPPED' },
          'TRIP_ALERT_RUN_SKIPPED',
        );
      }
    } catch (error: unknown) {
      // A scheduler callback has no caller to rethrow to: log it; the next minute retries.
      this.logger.error(
        { err: error, event: 'TRIP_ALERT_RUN_FAILED' },
        'TRIP_ALERT_RUN_FAILED',
      );
    }
  }
}

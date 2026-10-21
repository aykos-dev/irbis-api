import { Injectable, Logger } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { AppConfig } from '../../config/app-config.js';
import { PhoneCipher } from '../auth/phone-cipher.js';
import { SmsSender } from '../auth/sms-sender.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { LevelsService } from '../levels/levels.service.js';
import type {
  CheckInWaypointDto,
  SendSosDto,
} from './dto/trip-plan.request.dto.js';
import type {
  SosContactDto,
  SosResultDto,
  WaypointResultDto,
} from './dto/trip-plan.response.dto.js';
import { sosText } from './sos.sms.js';
import { PING_FUTURE_SKEW_MS, PING_STATUSES } from './trip-plan.constants.js';
import {
  SosSendFailedError,
  SosTooSoonError,
  TripNotActiveError,
  TripNotFoundError,
} from './trip-plan.errors.js';
import {
  TripPlanRepository,
  type SafetyTripRecord,
} from './trip-plan.repository.js';
import { assertWaypointAllowed } from './waypoint.rules.js';

/** Two fast taps race for the same n; the loser re-reads and re-checks the rules once per retry. */
const WAYPOINT_INSERT_ATTEMPTS = 3;

/** Active-trip safety actions: waypoint check-ins (AC6) and SOS (AC7). */
@Injectable()
export class TripSafetyService {
  private readonly logger = new Logger(TripSafetyService.name);

  constructor(
    private readonly repository: TripPlanRepository,
    private readonly gameConfig: GameConfigService,
    private readonly levels: LevelsService,
    private readonly phoneCipher: PhoneCipher,
    private readonly sms: SmsSender,
    private readonly config: AppConfig,
  ) {}

  /** AC6: one waypoint check-in on an active or alerted trip, with its XP award. */
  async checkInWaypoint(
    userId: string,
    id: string,
    dto: CheckInWaypointDto,
    now = new Date(),
  ): Promise<WaypointResultDto> {
    const trip = await this.activeTrip(userId, id);
    const recordedAt = new Date(dto.recordedAt);
    if (recordedAt.getTime() > now.getTime() + PING_FUTURE_SKEW_MS) {
      throw new RequestValidationError({ recordedAt: ['notInFuture'] });
    }
    if (trip.startedAt && recordedAt.getTime() < trip.startedAt.getTime()) {
      throw new RequestValidationError({ recordedAt: ['notBeforeStart'] });
    }
    const { waypoint: rules } = await this.gameConfig.tripActiveConfig(
      now.getTime(),
    );
    const fix = {
      lat: dto.lat,
      lng: dto.lng,
      accuracyM: dto.accuracyM,
      recordedAt,
    };

    for (let attempt = 1; ; attempt += 1) {
      const earlier = await this.repository.listWaypoints(id);
      assertWaypointAllowed(fix, earlier, rules);
      const n = earlier.length + 1;
      const row = await this.repository.insertWaypoint({
        tripId: id,
        n,
        ...fix,
      });
      if (row) {
        const xpAwarded = await this.award(userId, row.id, rules.xp, now);
        if (xpAwarded > 0)
          await this.repository.setWaypointXp(row.id, xpAwarded);
        return {
          waypoint: { n, lat: fix.lat, lng: fix.lng, recordedAt },
          xpAwarded,
        };
      }
      if (attempt >= WAYPOINT_INSERT_ATTEMPTS) {
        throw new Error(`Waypoint n kept colliding for trip ${id}`);
      }
    }
  }

  /**
   * AC7: texts the emergency contact the SOS with the best known location. The attempt is stored
   * either way; a failed send answers 502 so the app can open the phone's SMS app instead.
   */
  async sendSos(
    userId: string,
    id: string,
    dto: SendSosDto,
    now = new Date(),
  ): Promise<SosResultDto> {
    const trip = await this.activeTrip(userId, id);
    const { sosCooldownSec } = await this.gameConfig.tripActiveConfig(
      now.getTime(),
    );
    const lastAt = await this.repository.lastSosAt(id);
    if (lastAt) {
      const waitMs = lastAt.getTime() + sosCooldownSec * 1000 - now.getTime();
      if (waitMs > 0) throw new SosTooSoonError(Math.ceil(waitMs / 1000));
    }

    const [lat, lng] = sosLocation(trip, dto);
    let status: 'sent' | 'failed' = 'sent';
    try {
      await this.sms.sendText({
        userId,
        phone: this.phoneCipher.decrypt(trip.contactPhone),
        text: sosText({
          locale: trip.user.locale,
          name: trip.user.username,
          place: trip.place,
          lat,
          lng,
          liveUrl: trip.liveToken
            ? `${this.config.webPublicUrl}/t/${trip.liveToken}`
            : this.config.webPublicUrl,
        }),
      });
    } catch {
      // The provider error may echo the phone or text: log only the trip.
      status = 'failed';
      this.logger.warn(
        { event: 'TRIP_SOS_FAILED', tripId: id },
        'TRIP_SOS_FAILED',
      );
    }
    await this.repository.insertSos({
      tripId: id,
      lat,
      lng,
      sentAt: now,
      status,
    });
    if (status === 'failed') throw new SosSendFailedError();
    return {
      sentAt: now,
      contactName: trip.contactName,
      sosCallNumber: this.config.sosCallNumber ?? null,
    };
  }

  /** AC7: the contact's full phone and the rescue number, for the app's call / SMS fallback. */
  async sosContact(userId: string, id: string): Promise<SosContactDto> {
    const trip = await this.activeTrip(userId, id);
    return {
      phone: this.phoneCipher.decrypt(trip.contactPhone),
      sosCallNumber: this.config.sosCallNumber ?? null,
    };
  }

  private async activeTrip(
    userId: string,
    id: string,
  ): Promise<SafetyTripRecord> {
    const trip = await this.repository.findSafetyTrip(userId, id);
    if (!trip) throw new TripNotFoundError();
    if (!PING_STATUSES.includes(trip.status)) throw new TripNotActiveError();
    return trip;
  }

  /** XP the ledger actually granted (0 when capped or when the config gives none). */
  private async award(
    userId: string,
    refId: string,
    amount: number,
    now: Date,
  ): Promise<number> {
    if (amount <= 0) return 0;
    const result = await this.levels.award(
      { userId, source: 'waypoint', refId, amount },
      now,
    );
    return result.entry?.amount ?? 0;
  }
}

/** Body fix → last ping → start fix → the place's own coordinates. */
export function sosLocation(
  trip: Pick<
    SafetyTripRecord,
    'lastLat' | 'lastLng' | 'startLat' | 'startLng' | 'place'
  >,
  dto: SendSosDto,
): [number, number] {
  const pair = (
    lat: number | null | undefined,
    lng: number | null | undefined,
  ): [number, number] | null =>
    typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;
  return (
    pair(dto.lat, dto.lng) ??
    pair(trip.lastLat, trip.lastLng) ??
    pair(trip.startLat, trip.startLng) ?? [
      trip.place.latitude,
      trip.place.longitude,
    ]
  );
}

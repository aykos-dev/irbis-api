import { Injectable } from '@nestjs/common';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { AppConfig } from '../../config/app-config.js';
import { addMs } from '../../lib/dates.js';
import { GameConfigService } from '../levels/game-config.service.js';
import type { PostTripLocationDto } from './dto/trip-plan.request.dto.js';
import type {
  CurrentTripsDto,
  LiveTripDto,
  TripDto,
} from './dto/trip-plan.response.dto.js';
import { mapsUrl } from './trip-alert.sms.js';
import {
  LIVE_LINK_STATUSES,
  LIVE_TOKEN_PATTERN,
  PING_FUTURE_SKEW_MS,
  PING_STATUSES,
  type LiveTripStatusCode,
} from './trip-plan.constants.js';
import {
  LiveNotFoundError,
  TripNotActiveError,
  TripNotFoundError,
} from './trip-plan.errors.js';
import {
  TripPlanRepository,
  type LiveTripRecord,
} from './trip-plan.repository.js';
import type { CurrentTripsView, TripView } from './trip-plan.service.js';

const HOUR_MS = 3_600_000;

/** Active-trip rules: location pings, the public live page and the live fields of TripDto. */
@Injectable()
export class TripActiveService {
  constructor(
    private readonly repository: TripPlanRepository,
    private readonly gameConfig: GameConfigService,
    private readonly config: AppConfig,
  ) {}

  /** AC4: the response TripDto: live link (active/alerted/checked_out) and the ping cadence. */
  async present(view: TripView, now = new Date()): Promise<TripDto> {
    const { pingEveryMin } = await this.gameConfig.tripActiveConfig(
      now.getTime(),
    );
    return this.toDto(view, pingEveryMin);
  }

  async presentCurrent(
    current: CurrentTripsView,
    now = new Date(),
  ): Promise<CurrentTripsDto> {
    const { pingEveryMin } = await this.gameConfig.tripActiveConfig(
      now.getTime(),
    );
    return {
      active: current.active ? this.toDto(current.active, pingEveryMin) : null,
      planned: current.planned.map((t) => this.toDto(t, pingEveryMin)),
    };
  }

  /**
   * AC3: stores the fix and the running totals of an active or alerted trip. A fix older than the
   * stored one is ignored (pings may arrive out of order after a network gap).
   */
  async postLocation(
    userId: string,
    id: string,
    dto: PostTripLocationDto,
    now = new Date(),
  ): Promise<void> {
    const trip = await this.repository.findOwnTrip(userId, id);
    if (!trip) throw new TripNotFoundError();
    if (!PING_STATUSES.includes(trip.status)) throw new TripNotActiveError();

    const recordedAt = new Date(dto.recordedAt);
    if (recordedAt.getTime() > now.getTime() + PING_FUTURE_SKEW_MS) {
      throw new RequestValidationError({ recordedAt: ['notInFuture'] });
    }
    if (trip.startedAt && recordedAt.getTime() < trip.startedAt.getTime()) {
      throw new RequestValidationError({ recordedAt: ['notBeforeStart'] });
    }
    if (trip.lastLocationAt && recordedAt < trip.lastLocationAt) return;

    // The guarded write also drops a fix that lost a race with a newer one or with check-out.
    await this.repository.recordPing(id, PING_STATUSES, {
      lat: dto.lat,
      lng: dto.lng,
      accuracyM: dto.accuracyM,
      recordedAt,
      distanceM: dto.distanceM,
      climbM: dto.climbM,
    });
  }

  /** AC5: the public view behind a live link. Planned trips and unknown tokens are LIVE_NOT_FOUND. */
  async live(token: string, now = new Date()): Promise<LiveTripDto> {
    if (!LIVE_TOKEN_PATTERN.test(token)) throw new LiveNotFoundError();
    const trip = await this.repository.findLiveTrip(token);
    if (!trip || trip.status === 'planned') throw new LiveNotFoundError();
    const { liveAfterCheckoutH } = await this.gameConfig.tripActiveConfig(
      now.getTime(),
    );
    const status = liveStatus(trip, now, liveAfterCheckoutH);
    const { nameUz, nameRu, nameEn } = trip.place;
    const dto: LiveTripDto = {
      displayName: trip.user.displayName ?? trip.user.username,
      placeNames: { uz: nameUz, ru: nameRu ?? nameUz, en: nameEn ?? nameUz },
      backBy: trip.backBy,
      status,
    };
    if (status === 'ended') return dto;
    if (trip.lastLocationAt) dto.lastLocationAt = trip.lastLocationAt;
    if (trip.lastLat !== null && trip.lastLng !== null) {
      dto.mapsUrl = mapsUrl(trip.lastLat, trip.lastLng);
    }
    return dto;
  }

  private toDto(view: TripView, pingEveryMin: number): TripDto {
    const { liveToken, ...rest } = view;
    return {
      ...rest,
      liveUrl:
        liveToken && LIVE_LINK_STATUSES.includes(view.status)
          ? `${this.config.webPublicUrl}/t/${liveToken}`
          : null,
      pingEveryMin,
    };
  }
}

/** AC5: late = active past backBy; back_safe for liveAfterCheckoutH after check-out, then ended. */
export function liveStatus(
  trip: Pick<LiveTripRecord, 'status' | 'backBy' | 'checkedOutAt'>,
  now: Date,
  liveAfterCheckoutH: number,
): LiveTripStatusCode {
  if (trip.status === 'alerted') return 'alerted';
  if (trip.status === 'checked_out') {
    const until = addMs(
      trip.checkedOutAt ?? trip.backBy,
      liveAfterCheckoutH * HOUR_MS,
    );
    return now.getTime() < until.getTime() ? 'back_safe' : 'ended';
  }
  return now.getTime() > trip.backBy.getTime() ? 'late' : 'on_trip';
}

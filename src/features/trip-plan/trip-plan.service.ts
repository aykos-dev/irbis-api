import { Injectable } from '@nestjs/common';
import { addMs } from '../../lib/dates.js';
import { PhoneCipher } from '../auth/phone-cipher.js';
import { maskPhone } from '../auth/phone.rules.js';
import { tashkentDate } from '../conditions/weekend-window.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { PlaceNotFoundError } from '../places/places.errors.js';
import type {
  CheckOutTripDto,
  CreateTripDto,
  PutEmergencyContactDto,
  StartTripDto,
  UpdateTripDto,
} from './dto/trip-plan.request.dto.js';
import type {
  EmergencyContactDto,
  TripDto,
  TripPreviewDto,
} from './dto/trip-plan.response.dto.js';
import { gearList } from './gear.rules.js';
import { newLiveToken } from './live-token.js';
import { sunsetAt } from './sunset.js';
import { PLANNED_TRIP_LOOKBACK_MS } from './trip-plan.constants.js';
import {
  EmergencyContactRequiredError,
  TripAlreadyActiveError,
  TripNotEditableError,
  TripNotFoundError,
  TripTimesInvalidError,
} from './trip-plan.errors.js';
import {
  TripPlanRepository,
  type TripChange,
  type TripGuard,
  type PreviewPlace,
  type TripRow,
} from './trip-plan.repository.js';
import { assertTripTimes } from './trip-times.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** A trip as this service returns it; TripActiveService.present turns it into the response TripDto. */
export type TripView = Omit<TripDto, 'liveUrl' | 'pingEveryMin'> & {
  liveToken: string | null;
};

export interface CurrentTripsView {
  active: TripView | null;
  planned: TripView[];
}

/** Forecast min/max °C for `date` from the stored Open-Meteo daily block; null when the day is missing. */
function forecastFor(
  daily: PreviewPlace['daily'],
  date: string,
): { minC: number | null; maxC: number | null } | null {
  if (!daily) return null;
  const i = daily.time.indexOf(date);
  if (i < 0) return null;
  return {
    minC: daily.temperature_2m_min?.[i] ?? null,
    maxC: daily.temperature_2m_max?.[i] ?? null,
  };
}

@Injectable()
export class TripPlanService {
  constructor(
    private readonly repository: TripPlanRepository,
    private readonly gameConfig: GameConfigService,
    private readonly phoneCipher: PhoneCipher,
  ) {}

  /** AC3 + AC5: sunset, daylight buffer and the gear list for a planned window at a place. */
  async preview(
    placeId: string,
    startAt: Date,
    backBy: Date,
    now = new Date(),
  ): Promise<TripPreviewDto> {
    const place = await this.repository.findPreviewPlace(placeId);
    if (!place) throw new PlaceNotFoundError();
    const config = await this.gameConfig.tripConfig(now.getTime());
    assertTripTimes(startAt, backBy, now, config);

    const startDate = tashkentDate(startAt);
    const sameDay = tashkentDate(backBy) === startDate;
    const sunset = sunsetAt(place.latitude, place.longitude, startDate);
    return {
      sunsetAt: sunset,
      daylightBufferMin: sameDay
        ? Math.round((sunset.getTime() - backBy.getTime()) / MINUTE_MS)
        : null,
      gear: gearList({
        placeType: place.type,
        hours: (backBy.getTime() - startAt.getTime()) / HOUR_MS,
        forecast: forecastFor(place.daily, startDate),
        sunsetAt: sunset,
        backBy,
        gear: config.gear,
      }),
    };
  }

  /** AC4: the saved contact (masked phone) or null. */
  async getEmergencyContact(
    userId: string,
  ): Promise<EmergencyContactDto | null> {
    const contact = await this.repository.findContact(userId);
    if (!contact) return null;
    return {
      name: contact.name,
      relation: contact.relation,
      phoneMasked: maskPhone(contact.phoneLast2),
    };
  }

  /** AC4: create or replace the contact; the phone is stored encrypted, only its last two digits in clear. */
  async putEmergencyContact(
    userId: string,
    dto: PutEmergencyContactDto,
  ): Promise<EmergencyContactDto> {
    const phoneLast2 = dto.phone.slice(-2);
    await this.repository.upsertContact(userId, {
      name: dto.name,
      relation: dto.relation,
      phone: this.phoneCipher.encrypt(dto.phone),
      phoneLast2,
    });
    return {
      name: dto.name,
      relation: dto.relation,
      phoneMasked: maskPhone(phoneLast2),
    };
  }

  /** AC6: planned, or active right away with `start`; at most one active trip per user. */
  async create(
    userId: string,
    dto: CreateTripDto,
    now = new Date(),
  ): Promise<TripView> {
    const startAt = new Date(dto.startAt);
    const backBy = new Date(dto.backBy);
    const config = await this.gameConfig.tripConfig(now.getTime());
    assertTripTimes(startAt, backBy, now, config);
    if (!(await this.repository.placeExists(dto.placeId))) {
      throw new PlaceNotFoundError();
    }
    const contact = await this.repository.findContact(userId);
    if (!contact) throw new EmergencyContactRequiredError();
    if (dto.start && (await this.repository.hasActiveTrip(userId))) {
      throw new TripAlreadyActiveError();
    }
    const trip = await this.repository.createTrip({
      userId,
      placeId: dto.placeId,
      status: dto.start ? 'active' : 'planned',
      startAt,
      backBy,
      alertEnabled: dto.alertEnabled,
      contact,
      startedAt: dto.start ? now : null,
      location: dto.start && dto.location ? dto.location : null,
      liveToken: dto.start ? newLiveToken() : null,
    });
    return this.toDto(trip, config.alertDelayMin);
  }

  /**
   * AC6: the active trip and planned trips that started at most a day ago, earliest first.
   * An active trip started before live links existed gets its token here (active-trip AC4).
   */
  async current(userId: string, now = new Date()): Promise<CurrentTripsView> {
    const config = await this.gameConfig.tripConfig(now.getTime());
    const [active, planned] = await Promise.all([
      this.repository.findActiveTrip(userId),
      this.repository.listPlannedTrips(
        userId,
        addMs(now, -PLANNED_TRIP_LOOKBACK_MS),
      ),
    ]);
    if (active && !active.liveToken) {
      active.liveToken = await this.repository.backfillLiveToken(
        active.id,
        newLiveToken(),
      );
    }
    return {
      active: active ? this.toDto(active, config.alertDelayMin) : null,
      planned: planned.map((t) => this.toDto(t, config.alertDelayMin)),
    };
  }

  /** AC6: planned → active now; backBy must still be ahead and no other trip may be active. */
  async start(
    userId: string,
    id: string,
    dto: StartTripDto,
    now = new Date(),
  ): Promise<TripView> {
    const trip = await this.ownTrip(userId, id);
    if (trip.status !== 'planned') throw new TripNotEditableError();
    if (trip.backBy.getTime() <= now.getTime()) {
      throw new TripTimesInvalidError('backBy has passed');
    }
    if (await this.repository.hasActiveTrip(userId)) {
      throw new TripAlreadyActiveError();
    }
    return this.apply(
      id,
      { statuses: ['planned'] },
      {
        status: 'active',
        startedAt: now,
        location: dto.location ?? null,
        liveToken: newLiveToken(),
      },
      now,
    );
  }

  /**
   * AC7: planned → startAt/backBy/alertEnabled under the create rules; active → backBy and
   * alertEnabled only, until the alert is sent; anything else is not editable.
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateTripDto,
    now = new Date(),
  ): Promise<TripView> {
    const trip = await this.ownTrip(userId, id);
    const config = await this.gameConfig.tripConfig(now.getTime());
    const startAt = dto.startAt ? new Date(dto.startAt) : undefined;
    const backBy = dto.backBy ? new Date(dto.backBy) : undefined;
    const change: TripChange = {
      startAt,
      backBy,
      alertEnabled: dto.alertEnabled,
    };

    if (trip.status === 'planned') {
      if (startAt || backBy) {
        assertTripTimes(
          startAt ?? trip.startAt,
          backBy ?? trip.backBy,
          now,
          config,
        );
      }
      return this.apply(id, { statuses: ['planned'] }, change, now);
    }
    if (trip.status !== 'active' || trip.alertSentAt || startAt) {
      throw new TripNotEditableError();
    }
    if (backBy) {
      if (backBy.getTime() <= now.getTime()) {
        throw new TripTimesInvalidError('backBy must be in the future');
      }
      const latest = trip.startAt.getTime() + config.maxDurationH * HOUR_MS;
      if (backBy.getTime() > latest) {
        throw new TripTimesInvalidError('trip is longer than allowed');
      }
    }
    return this.apply(
      id,
      { statuses: ['active'], alertNotSent: true },
      change,
      now,
    );
  }

  /** AC7: active or alerted → checked_out; optional final totals are stored (active-trip AC8). */
  async checkOut(
    userId: string,
    id: string,
    stats: CheckOutTripDto = {},
    now = new Date(),
  ): Promise<TripView> {
    const trip = await this.ownTrip(userId, id);
    if (trip.status !== 'active' && trip.status !== 'alerted') {
      throw new TripNotEditableError();
    }
    return this.apply(
      id,
      { statuses: ['active', 'alerted'] },
      {
        status: 'checked_out',
        checkedOutAt: now,
        distanceM: stats.distanceM,
        climbM: stats.climbM,
      },
      now,
    );
  }

  /** AC7: only a planned trip can be deleted. */
  async remove(userId: string, id: string): Promise<void> {
    const trip = await this.ownTrip(userId, id);
    if (
      trip.status !== 'planned' ||
      !(await this.repository.deletePlanned(id))
    ) {
      throw new TripNotEditableError();
    }
  }

  private async ownTrip(userId: string, id: string): Promise<TripRow> {
    const trip = await this.repository.findOwnTrip(userId, id);
    if (!trip) throw new TripNotFoundError();
    return trip;
  }

  /** Writes the change under its guard; a lost race (status moved meanwhile) is TRIP_NOT_EDITABLE. */
  private async apply(
    id: string,
    guard: TripGuard,
    change: TripChange,
    now: Date,
  ): Promise<TripView> {
    const updated = await this.repository.updateIf(id, guard, change);
    if (!updated) throw new TripNotEditableError();
    const config = await this.gameConfig.tripConfig(now.getTime());
    return this.toDto(updated, config.alertDelayMin);
  }

  private toDto(trip: TripRow, alertDelayMin: number): TripView {
    return {
      id: trip.id,
      place: trip.place,
      status: trip.status,
      startAt: trip.startAt,
      backBy: trip.backBy,
      alertAt: addMs(trip.backBy, alertDelayMin * MINUTE_MS),
      alertEnabled: trip.alertEnabled,
      startedAt: trip.startedAt,
      checkedOutAt: trip.checkedOutAt,
      alertSentAt: trip.alertSentAt,
      contact: {
        name: trip.contactName,
        relation: trip.contactRelation,
        // maskPhone only reads the last two digits.
        phoneMasked: maskPhone(trip.contactPhoneLast2),
      },
      liveToken: trip.liveToken,
      lastLocationAt: trip.lastLocationAt,
      distanceM: trip.distanceM,
      climbM: trip.climbM,
      waypoints: trip.waypoints,
    };
  }
}

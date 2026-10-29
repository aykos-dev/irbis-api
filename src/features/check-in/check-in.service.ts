import { Injectable } from '@nestjs/common';
import type { CheckInConfig } from '../levels/game-config.schema.js';
import { GameConfigService } from '../levels/game-config.service.js';
import { LevelsService } from '../levels/levels.service.js';
import { PlaceNotFoundError } from '../places/places.errors.js';
import { WeeklyPathService } from '../weekly-path/weekly-path.service.js';
import type { CreateCheckInDto } from './dto/check-in.request.dto.js';
import type { CheckInResultDto } from './dto/check-in.response.dto.js';
import {
  assertFixAtPlace,
  assertRecordedAtAllowed,
  checkInMonth,
  checkInXp,
} from './check-in.rules.js';
import {
  CheckInRepository,
  type CheckInRecord,
} from './check-in.repository.js';

/** A same-clientId retry and a concurrent counted insert both collide; each retry re-reads first. */
const INSERT_ATTEMPTS = 3;

export interface CheckInOutcome {
  result: CheckInResultDto;
  /** False when this clientId was already stored (the stored result is replayed). */
  created: boolean;
}

/** Verified place check-ins (features/check-in.md AC1–AC3): rules, the monthly counted row, XP. */
@Injectable()
export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository,
    private readonly gameConfig: GameConfigService,
    private readonly levels: LevelsService,
    private readonly weeklyPath: WeeklyPathService,
  ) {}

  async create(
    userId: string,
    dto: CreateCheckInDto,
    now = new Date(),
  ): Promise<CheckInOutcome> {
    const stored = await this.repository.findByClientId(userId, dto.clientId);
    if (stored) return replay(stored);

    const config = await this.gameConfig.checkInConfig(now.getTime());
    const recordedAt = new Date(dto.recordedAt);
    assertRecordedAtAllowed(recordedAt, now, config);
    const place = await this.repository.findPlace(dto.placeId);
    if (!place) throw new PlaceNotFoundError();
    assertFixAtPlace(dto, place, config);

    const month = checkInMonth(recordedAt);
    for (let attempt = 1; ; attempt += 1) {
      const row = await this.repository.insert({
        userId,
        placeId: place.id,
        clientId: dto.clientId,
        lat: dto.lat,
        lng: dto.lng,
        accuracyM: dto.accuracyM,
        recordedAt,
        month,
      });
      if (row) {
        if (!row.counted) return { result: toResult(row), created: true };
        return {
          result: await this.reward(userId, row, place.difficulty, now, config),
          created: true,
        };
      }
      const raced = await this.repository.findByClientId(userId, dto.clientId);
      if (raced) return replay(raced);
      if (attempt >= INSERT_ATTEMPTS) {
        throw new Error(`Check-in insert kept colliding for place ${place.id}`);
      }
    }
  }

  /** AC1: XP, the level fact and the weekly-path visit for a counted check-in. */
  private async reward(
    userId: string,
    row: CheckInRecord,
    difficulty: number,
    now: Date,
    config: CheckInConfig,
  ): Promise<CheckInResultDto> {
    const award = await this.levels.award(
      {
        userId,
        source: 'check_in',
        refId: row.id,
        amount: checkInXp(difficulty, config),
      },
      now,
    );
    const fact = await this.levels.recordFact(
      { userId, kind: 'check_in', refId: row.id, difficulty },
      now,
    );
    const visit = await this.weeklyPath.recordVisit(
      userId,
      row.placeId,
      row.recordedAt,
    );
    const xp = award.entry?.amount ?? 0;
    await this.repository.setOutcome(row.id, {
      xpAwarded: xp,
      pathVisited: visit.recorded,
    });
    return {
      ...toResult(row),
      xp,
      pathVisited: visit.recorded,
      levelUps: [...award.levelUps, ...fact.levelUps].map(
        ({ id, fromLevel, toLevel }) => ({ id, fromLevel, toLevel }),
      ),
    };
  }
}

function toResult(row: CheckInRecord): CheckInResultDto {
  return {
    id: row.id,
    placeId: row.placeId,
    recordedAt: row.recordedAt,
    counted: row.counted,
    xp: row.xpAwarded,
    levelUps: [],
    pathVisited: row.pathVisited,
  };
}

function replay(row: CheckInRecord): CheckInOutcome {
  return { result: toResult(row), created: false };
}

import { Injectable, Logger } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { PlaceNotFoundError } from '../places/places.errors.js';
import {
  ADMIN_CONDITIONS_DEFAULT_LIMIT,
  OVERRIDE_MAX_DAYS,
  type AdminStatusFilter,
  type ClosureSourceCode,
  type ConditionStatusCode,
} from './conditions.constants.js';
import {
  ClosureAlreadyEndedError,
  ClosureNotFoundError,
  OverrideAlreadyEndedError,
  OverrideNotFoundError,
  RecomputeRunningError,
} from './conditions.errors.js';
import { ConditionsJob } from './conditions.job.js';
import {
  ConditionsRepository,
  type AdminConditionRecord,
  type ClosureRecord,
  type LocalizedText,
  type OverrideRecord,
} from './conditions.repository.js';
import {
  ConditionsService,
  type PlaceConditionResult,
} from './conditions.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ClosureView extends ClosureRecord {
  active: boolean;
}

export interface OverrideView extends OverrideRecord {
  active: boolean;
}

export interface AdminConditionPage {
  items: AdminConditionRecord[];
  nextCursor: string | null;
  total: number;
}

export interface ConditionControls {
  condition: PlaceConditionResult;
  closures: ClosureView[];
  overrides: OverrideView[];
}

export interface ClosureInput {
  startsAt: Date;
  endsAt: Date | null;
  reason: LocalizedText;
  source: ClosureSourceCode;
}

export interface OverrideInput {
  status: ConditionStatusCode;
  reason: LocalizedText;
  expiresAt: Date;
}

export const closureActive = (c: ClosureRecord, now: Date): boolean =>
  c.endedAt === null &&
  c.startsAt <= now &&
  (c.endsAt === null || c.endsAt > now);

export const overrideActive = (o: OverrideRecord, now: Date): boolean =>
  o.endedAt === null && o.expiresAt > now;

/** Admin closures, overrides and the manual recompute. Every write recomputes the place before answering. */
@Injectable()
export class AdminConditionsService {
  private readonly logger = new Logger(AdminConditionsService.name);

  constructor(
    private readonly repo: ConditionsRepository,
    private readonly conditions: ConditionsService,
    private readonly job: ConditionsJob,
  ) {}

  async list(query: {
    status?: AdminStatusFilter;
    cursor?: string;
    limit?: number;
  }): Promise<AdminConditionPage> {
    const limit = query.limit ?? ADMIN_CONDITIONS_DEFAULT_LIMIT;
    const { rows, total } = await this.repo.listAdmin({
      status: query.status,
      after: parseCursor(query.cursor),
      limit: limit + 1,
      now: new Date(),
    });
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({ name: last.name.uz, id: last.placeId })
          : null,
      total,
    };
  }

  async controls(
    placeId: string,
    now: Date = new Date(),
  ): Promise<ConditionControls> {
    const condition = await this.conditions.getCondition(placeId, now);
    const { closures, overrides } = await this.repo.listControls(placeId);
    return {
      condition,
      closures: closures.map((c) => ({ ...c, active: closureActive(c, now) })),
      overrides: overrides.map((o) => ({
        ...o,
        active: overrideActive(o, now),
      })),
    };
  }

  async createClosure(
    adminId: string,
    placeId: string,
    input: ClosureInput,
    now: Date = new Date(),
  ): Promise<ClosureView> {
    if (input.endsAt !== null && input.endsAt <= input.startsAt) {
      throw new RequestValidationError({ endsAt: ['afterStartsAt'] });
    }
    await this.requirePlace(placeId);
    const closure = await this.repo.createClosure({
      ...input,
      placeId,
      createdById: adminId,
    });
    await this.conditions.recomputePlace(placeId, now);
    return { ...closure, active: closureActive(closure, now) };
  }

  async endClosure(
    adminId: string,
    id: string,
    now: Date = new Date(),
  ): Promise<ClosureView> {
    const existing = await this.repo.findClosure(id);
    if (!existing) throw new ClosureNotFoundError();
    const ended = await this.repo.endClosure(id, adminId, now);
    if (!ended) throw new ClosureAlreadyEndedError();
    await this.conditions.recomputePlace(ended.placeId, now);
    return { ...ended, active: false };
  }

  async createOverride(
    adminId: string,
    placeId: string,
    input: OverrideInput,
    now: Date = new Date(),
  ): Promise<OverrideView> {
    const latest = now.getTime() + OVERRIDE_MAX_DAYS * DAY_MS;
    const expires = input.expiresAt.getTime();
    if (expires <= now.getTime() || expires > latest) {
      throw new RequestValidationError({ expiresAt: ['withinMaxDays'] });
    }
    await this.requirePlace(placeId);
    const override = await this.repo.replaceOverride(
      { ...input, placeId, createdById: adminId },
      now,
    );
    await this.conditions.recomputePlace(placeId, now);
    return { ...override, active: overrideActive(override, now) };
  }

  async endOverride(
    adminId: string,
    id: string,
    now: Date = new Date(),
  ): Promise<OverrideView> {
    const existing = await this.repo.findOverride(id);
    if (!existing) throw new OverrideNotFoundError();
    const ended = await this.repo.endOverride(id, adminId, now);
    if (!ended) throw new OverrideAlreadyEndedError();
    await this.conditions.recomputePlace(ended.placeId, now);
    return { ...ended, active: false };
  }

  /** Starts fetch + recompute in the background. 409 while a run (cron or manual) is in progress. */
  startRecompute(): { startedAt: Date } {
    if (this.job.isRunning()) throw new RecomputeRunningError();
    const startedAt = new Date();
    this.job.runNow().then(
      (ran) => {
        if (!ran) {
          this.logger.warn(
            { event: 'CONDITIONS_RUN_SKIPPED' },
            'CONDITIONS_RUN_SKIPPED',
          );
        }
      },
      (error: unknown) => {
        // Background run: no caller to rethrow to. The next hourly run retries.
        this.logger.error(
          { err: error, event: 'CONDITIONS_RUN_FAILED' },
          'CONDITIONS_RUN_FAILED',
        );
      },
    );
    return { startedAt };
  }

  private async requirePlace(placeId: string): Promise<void> {
    if (!(await this.repo.placeExists(placeId))) throw new PlaceNotFoundError();
  }
}

function parseCursor(
  raw: string | undefined,
): { nameUz: string; id: string } | null {
  if (!raw) return null;
  const payload = decodeCursor(raw);
  if (
    typeof payload?.name !== 'string' ||
    typeof payload.id !== 'string' ||
    !isUUID(payload.id)
  ) {
    throw new RequestValidationError({ cursor: ['invalid'] });
  }
  return { nameUz: payload.name, id: payload.id };
}

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DomainError } from '../../common/errors/domain.error.js';
import {
  GuestMergeRegistry,
  type GuestMergeHandler,
} from '../auth/guest-merge/guest-merge.registry.js';
import { LessonsService } from './lessons.service.js';
import { CompletionInputDto } from './dto/lessons.request.dto.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Guest lesson completions (`lessons.completions`) run the normal completion flow one by one.
 * Malformed, unknown or failing entries are skipped; repeats award nothing, so merging twice is safe.
 */
@Injectable()
export class LessonsMergeHandler implements GuestMergeHandler, OnModuleInit {
  readonly key = 'lessons';
  private readonly logger = new Logger(LessonsMergeHandler.name);

  constructor(
    private readonly registry: GuestMergeRegistry,
    private readonly lessons: LessonsService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async merge(userId: string, value: unknown): Promise<void> {
    if (!isRecord(value) || !Array.isArray(value.completions)) return;
    const items: unknown[] = value.completions;
    for (const [index, item] of items.entries()) {
      const input = plainToInstance(CompletionInputDto, item);
      if (
        !isRecord(item) ||
        (await validate(input, { whitelist: true, forbidNonWhitelisted: true }))
          .length > 0
      ) {
        this.logger.warn(
          { index, reason: 'VALIDATION_FAILED' },
          'Guest lesson completion skipped',
        );
        continue;
      }
      try {
        await this.lessons.complete(userId, input);
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        this.logger.warn(
          { index, reason: error.code },
          'Guest lesson completion skipped',
        );
      }
    }
  }
}

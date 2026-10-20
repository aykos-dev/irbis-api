import { HttpStatus } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  NotFoundError,
} from '../../common/errors/domain.error.js';
import type { FieldErrors } from '../../common/errors/validation.error.js';

export class TierNotFoundError extends NotFoundError {
  override readonly code = 'TIER_NOT_FOUND';

  constructor() {
    super('Lesson tier not found');
  }
}

export class TierKeyTakenError extends ConflictError {
  override readonly code = 'TIER_KEY_TAKEN';

  constructor() {
    super('A tier with this key already exists');
  }
}

export class TierNotEmptyError extends ConflictError {
  override readonly code = 'TIER_NOT_EMPTY';

  constructor() {
    super('The tier still has lessons');
  }
}

export class LessonNotFoundError extends NotFoundError {
  override readonly code = 'LESSON_NOT_FOUND';

  constructor() {
    super('Lesson not found');
  }
}

export class LessonPublishedError extends ConflictError {
  override readonly code = 'LESSON_PUBLISHED';

  constructor() {
    super('Unpublish the lesson before deleting it');
  }
}

/** 422: the lesson misses something publishing needs; `fieldErrors` lists every failing path. */
export class LessonNotPublishableError extends DomainError {
  readonly code = 'LESSON_NOT_PUBLISHABLE';
  readonly status = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(override readonly fieldErrors: FieldErrors) {
    super('The lesson is not ready to publish');
  }
}

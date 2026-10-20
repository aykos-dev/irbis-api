import { NotFoundError } from '../../common/errors/domain.error.js';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import type { GradeFailure } from './lesson-grading.js';

/** Unknown, draft or malformed lesson id. */
export class LessonNotFoundError extends NotFoundError {
  override readonly code = 'LESSON_NOT_FOUND';

  constructor() {
    super('Lesson not found');
  }
}

/** 400 `VALIDATION_FAILED` at `attempts`: the run does not prove the lesson was passed. */
export const attemptsRejected = (
  reason: GradeFailure,
): RequestValidationError => new RequestValidationError({ attempts: [reason] });

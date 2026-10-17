import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

/** Documents the error body for each status, listing the stable `code`s a route can return there. */
export function ApiErrorResponses(
  codesByStatus: Record<number, readonly string[]>,
): MethodDecorator {
  return applyDecorators(
    ...Object.entries(codesByStatus).map(([status, codes]) =>
      ApiResponse({
        status: Number(status),
        type: ErrorResponseDto,
        description: `Error. code: ${codes.join(' | ')}`,
      }),
    ),
  );
}

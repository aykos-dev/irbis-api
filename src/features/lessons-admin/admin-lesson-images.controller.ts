import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { LessonImageUploadDto } from './dto/lessons-admin.response.dto.js';
import { ImageTooLargeInterceptor } from './image-too-large.interceptor.js';
import { LessonImagesService } from './lesson-images.service.js';
import { IMAGE_MAX_BYTES } from './lessons-admin.constants.js';

/** Question image upload (ADR-005): the api checks, re-encodes and stores the image. */
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminLessonImagesController {
  constructor(private readonly images: LessonImagesService) {}

  @Post('lesson-images')
  @UseInterceptors(
    ImageTooLargeInterceptor,
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    operationId: 'Admin_uploadLessonImage',
    summary:
      'Upload a question image (JPEG/PNG/WebP, ≤ 2 MB); stored re-encoded, longest side ≤ 1600 px, no metadata',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: LessonImageUploadDto })
  @ApiErrorResponses({
    400: ['VALIDATION_FAILED', 'BAD_REQUEST'],
    401: ['UNAUTHENTICATED'],
    403: ['FORBIDDEN', 'ACCOUNT_BLOCKED'],
    413: ['IMAGE_TOO_LARGE'],
    415: ['IMAGE_TYPE'],
    503: ['STORAGE_UNAVAILABLE'],
  })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<LessonImageUploadDto> {
    if (!file) throw new RequestValidationError({ file: ['required'] });
    return this.images.upload(file.buffer);
  }
}

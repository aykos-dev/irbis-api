import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import type { FieldErrors } from '../../common/errors/validation.error.js';
import { RequestValidationError } from '../../common/errors/validation.error.js';
import { StorageService } from '../../lib/storage/storage.service.js';
import type { QuestionContent } from './lesson.rules.js';
import {
  IMAGE_KEY_PATTERN,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_SIDE,
} from './lessons-admin.constants.js';
import { ImageTooLargeError, ImageTypeError } from './lessons-admin.errors.js';

const FORMATS = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
} as const;
type ImageFormat = keyof typeof FORMATS;

const isImageFormat = (format: string | undefined): format is ImageFormat =>
  format !== undefined && Object.hasOwn(FORMATS, format);

export interface UploadedImage {
  key: string;
  url: string;
  width: number;
  height: number;
}

export interface LessonImage {
  key: string;
  url: string;
}

/** Question images: upload (type/size check, re-encode without metadata) and key checks on save. */
@Injectable()
export class LessonImagesService {
  constructor(private readonly storage: StorageService) {}

  /** `file` is the raw upload; the type comes from the bytes, never from the client's mime or name. */
  async upload(file: Buffer): Promise<UploadedImage> {
    if (file.length > IMAGE_MAX_BYTES) throw new ImageTooLargeError();
    const format = await sniffFormat(file);
    const { data, info } = await sharp(file)
      .rotate()
      .resize(IMAGE_MAX_SIDE, IMAGE_MAX_SIDE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(format)
      .toBuffer({ resolveWithObject: true });
    const key = `lessons/${randomUUID()}.${FORMATS[format].ext}`;
    await this.storage.put(key, data, FORMATS[format].mime);
    return {
      key,
      url: this.storage.publicUrl(key),
      width: info.width,
      height: info.height,
    };
  }

  /** Every image key must have the upload key shape and exist in storage, else 400 at `questions.N.image`. */
  async checkKeys(questions: QuestionContent[]): Promise<void> {
    const errors: FieldErrors = {};
    await Promise.all(
      questions.map(async ({ imageKey }, i) => {
        if (imageKey === null) return;
        if (!IMAGE_KEY_PATTERN.test(imageKey)) {
          errors[`questions.${i}.image`] = ['invalidKey'];
        } else if (!(await this.storage.exists(imageKey))) {
          errors[`questions.${i}.image`] = ['notFound'];
        }
      }),
    );
    if (Object.keys(errors).length > 0) {
      throw new RequestValidationError(errors);
    }
  }

  imageOf(key: string): LessonImage {
    return { key, url: this.storage.publicUrl(key) };
  }
}

async function sniffFormat(file: Buffer): Promise<ImageFormat> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(file).metadata());
  } catch {
    throw new ImageTypeError();
  }
  if (!isImageFormat(format)) throw new ImageTypeError();
  return format;
}

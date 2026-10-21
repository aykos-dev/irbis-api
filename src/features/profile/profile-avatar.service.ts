import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from '../../lib/storage/storage.service.js';
import {
  AvatarImageTooLargeError,
  AvatarImageTypeError,
} from './profile.errors.js';

/** Upload limit from the AC; the controller applies the same number to multer. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** Avatars are square: the app shows them in a circle everywhere. */
export const AVATAR_SIZE = 512;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

/** Avatar bytes: sniff the real format, crop to a 512 square JPEG and store it without metadata. */
@Injectable()
export class ProfileAvatarService {
  constructor(private readonly storage: StorageService) {}

  /** `file` is the raw upload; the client's mime and filename are never trusted. */
  async upload(file: Buffer): Promise<string> {
    if (file.length > AVATAR_MAX_BYTES) throw new AvatarImageTooLargeError();
    await assertAcceptedFormat(file);
    const data = await sharp(file)
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 82 })
      .toBuffer();
    const key = `avatars/${randomUUID()}.jpg`;
    await this.storage.put(key, data, 'image/jpeg');
    return key;
  }
}

async function assertAcceptedFormat(file: Buffer): Promise<void> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(file).metadata());
  } catch {
    throw new AvatarImageTypeError();
  }
  if (format === undefined || !ACCEPTED_FORMATS.has(format)) {
    throw new AvatarImageTypeError();
  }
}

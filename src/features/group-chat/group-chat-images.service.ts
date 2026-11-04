import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from '../../lib/storage/storage.service.js';
import {
  GROUP_MESSAGE_PHOTO_MAX_BYTES,
  GROUP_MESSAGE_PHOTO_MAX_EDGE,
} from './group-chat.constants.js';
import { GroupAttachmentInvalidError } from './group-chat.errors.js';

const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'heif']);

@Injectable()
export class GroupChatImagesService {
  constructor(private readonly storage: StorageService) {}

  async upload(
    userId: string,
    bytes: Buffer,
  ): Promise<{ imageKey: string; imageUrl: string }> {
    if (!bytes.length || bytes.length > GROUP_MESSAGE_PHOTO_MAX_BYTES) {
      throw new GroupAttachmentInvalidError();
    }
    let format: string | undefined;
    try {
      ({ format } = await sharp(bytes).metadata());
    } catch {
      throw new GroupAttachmentInvalidError();
    }
    if (!format || !ACCEPTED.has(format))
      throw new GroupAttachmentInvalidError();
    const image = await sharp(bytes)
      .rotate()
      .resize(GROUP_MESSAGE_PHOTO_MAX_EDGE, GROUP_MESSAGE_PHOTO_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
    const imageKey = `group-chat/${userId}/${randomUUID()}.jpg`;
    await this.storage.put(imageKey, image, 'image/jpeg');
    return { imageKey, imageUrl: this.storage.publicUrl(imageKey) };
  }
}

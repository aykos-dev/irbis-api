import { Injectable } from '@nestjs/common';
import type { GuestMergeDto } from '../dto/guest-merge.dto.js';
import type { GuestMergeResponseDto } from '../dto/guest-merge.dto.js';
import { GuestMergeRegistry } from './guest-merge.registry.js';

/** POST /me/guest-merge: hands each part of the guest payload to the handler registered for it. */
@Injectable()
export class GuestMergeService {
  constructor(private readonly registry: GuestMergeRegistry) {}

  async merge(
    userId: string,
    dto: GuestMergeDto,
  ): Promise<GuestMergeResponseDto> {
    const merged: string[] = [];
    const skipped: string[] = [];
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      const handler = this.registry.get(key);
      if (!handler) {
        skipped.push(key);
        continue;
      }
      await handler.merge(userId, value);
      merged.push(key);
    }
    return { merged, skipped };
  }
}

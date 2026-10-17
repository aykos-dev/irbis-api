import { Injectable, type OnModuleInit } from '@nestjs/common';
import { LOCALES, type LocaleCode } from '../auth.constants.js';
import { AuthRepository } from '../auth.repository.js';
import {
  GuestMergeRegistry,
  type GuestMergeHandler,
} from './guest-merge.registry.js';

function isLocale(value: unknown): value is LocaleCode {
  return (LOCALES as readonly unknown[]).includes(value);
}

/** The guest's app language becomes the account language. */
@Injectable()
export class LocaleMergeHandler implements GuestMergeHandler, OnModuleInit {
  readonly key = 'locale';

  constructor(
    private readonly registry: GuestMergeRegistry,
    private readonly repository: AuthRepository,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async merge(userId: string, value: unknown): Promise<void> {
    if (isLocale(value)) {
      await this.repository.updateLocale(userId, value);
    }
  }
}

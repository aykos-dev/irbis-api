import { Injectable, type OnModuleInit } from '@nestjs/common';
import { AuthRepository } from '../auth.repository.js';
import { GuestOnboardingDto } from '../dto/guest-merge.dto.js';
import {
  GuestMergeRegistry,
  type GuestMergeHandler,
} from './guest-merge.registry.js';

/** Guest onboarding choices fill only the account's empty fields; existing values always win. */
@Injectable()
export class OnboardingMergeHandler implements GuestMergeHandler, OnModuleInit {
  readonly key = 'onboarding';

  constructor(
    private readonly registry: GuestMergeRegistry,
    private readonly repository: AuthRepository,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async merge(userId: string, value: unknown): Promise<void> {
    if (!(value instanceof GuestOnboardingDto)) return;
    await this.repository.fillEmptyOnboarding(userId, {
      experience: value.experience,
      interests: value.interests,
    });
  }
}

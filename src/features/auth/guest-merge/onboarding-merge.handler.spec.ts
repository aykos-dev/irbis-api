import type { AuthRepository } from '../auth.repository.js';
import { GuestOnboardingDto } from '../dto/guest-merge.dto.js';
import type { GuestMergeRegistry } from './guest-merge.registry.js';
import { OnboardingMergeHandler } from './onboarding-merge.handler.js';

describe('OnboardingMergeHandler', () => {
  it('passes the validated choices to the fill-only-empty write', async () => {
    const fillEmptyOnboarding = vi.fn().mockResolvedValue(undefined);
    const handler = new OnboardingMergeHandler(
      {} as GuestMergeRegistry,
      { fillEmptyOnboarding } as unknown as AuthRepository,
    );
    const dto = Object.assign(new GuestOnboardingDto(), {
      experience: 'weekend',
      interests: ['peaks'],
    });
    await handler.merge('user_1', dto);
    expect(fillEmptyOnboarding).toHaveBeenCalledWith('user_1', {
      experience: 'weekend',
      interests: ['peaks'],
    });
  });

  it('ignores a value that did not pass through the validated DTO', async () => {
    const fillEmptyOnboarding = vi.fn();
    const handler = new OnboardingMergeHandler(
      {} as GuestMergeRegistry,
      { fillEmptyOnboarding } as unknown as AuthRepository,
    );
    await handler.merge('user_1', { experience: 'weekend' });
    expect(fillEmptyOnboarding).not.toHaveBeenCalled();
  });
});

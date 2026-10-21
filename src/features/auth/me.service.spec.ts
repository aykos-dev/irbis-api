import { StorageUnavailableError } from '../../lib/storage/storage.errors.js';
import type { StorageService } from '../../lib/storage/storage.service.js';
import type { AuthRepository } from './auth.repository.js';
import { MeService, type MeUser } from './me.service.js';

const AT = new Date('2026-10-21T10:00:00Z');

const user: MeUser = {
  id: 'user_1',
  username: 'guest_1',
  locale: 'en',
  experience: 'weekend',
  interests: ['peaks'],
  role: 'user',
  recoveryPhone: null,
  recoveryPhoneVerifiedAt: null,
  createdAt: AT,
  level: 2,
  xpTotal: 300,
  displayName: null,
  bio: null,
  avatarKey: null,
  homeRegion: null,
  showStats: true,
  showHomeRegion: false,
  units: 'metric',
  appearance: 'auto',
  notifyStreak: true,
  notifyDailyGame: true,
  dailyGameTime: '19:00',
  notifyGroups: true,
  notifySocial: true,
  notifyOffers: false,
  publicProfile: true,
  findBuddies: true,
};

function setup(storage: Pick<StorageService, 'publicUrl'>) {
  const repository = {
    findById: () => Promise.resolve(user),
    hasPendingPhoneCode: () => Promise.resolve(false),
  };
  const service = new MeService(
    repository as unknown as AuthRepository,
    storage as StorageService,
  );
  return { service };
}

describe('MeService (AC1)', () => {
  it('returns the new profile fields and the defaults', async () => {
    const { service } = setup({
      publicUrl: () => {
        throw new StorageUnavailableError('NotConfigured');
      },
    });
    const me = await service.getMe(user.id);
    expect(me).toMatchObject({
      displayName: null,
      bio: null,
      avatarUrl: null,
      homeRegion: null,
      preferences: {
        showStats: true,
        showHomeRegion: false,
        units: 'metric',
        appearance: 'auto',
        notifications: {
          tripSafety: true,
          streakReminders: true,
          dailyGame: true,
          dailyGameTime: '19:00',
          groupsMessages: true,
          social: true,
          offers: false,
        },
        privacy: {
          publicProfile: true,
          findBuddies: true,
          shareLocation: 'trips',
        },
      },
    });
    expect(me.createdAt).toBe(AT.toISOString());
  });

  it('derives avatarUrl from the key; null when storage is unavailable', async () => {
    const { service: configured } = setup({
      publicUrl: (key: string) => `https://cdn.example/${key}`,
    });
    const withAvatar = { ...user, avatarKey: 'avatars/a.jpg' };
    expect((await configured.toMe(withAvatar, AT)).avatarUrl).toBe(
      'https://cdn.example/avatars/a.jpg',
    );

    const { service: unconfigured } = setup({
      publicUrl: () => {
        throw new StorageUnavailableError('NotConfigured');
      },
    });
    expect((await unconfigured.toMe(withAvatar, AT)).avatarUrl).toBeNull();
  });
});

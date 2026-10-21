import { StorageUnavailableError } from '../../../lib/storage/storage.errors.js';
import type { StorageService } from '../../../lib/storage/storage.service.js';
import type { InterestCode } from '../../auth/auth.constants.js';
import type { MeService } from '../../auth/me.service.js';
import { UpdateMeDto } from '../dto/profile.request.dto.js';
import type { MeResponseDto } from '../dto/profile.response.dto.js';
import { ProfileService } from '../profile.service.js';
import type {
  ProfileRepository,
  ProfileUpdate,
  PublicProfileRecord,
} from '../profile.repository.js';

const USER = 'user_1';
const AT = new Date('2026-10-21T10:00:00Z');

function setup(
  publicUser: PublicProfileRecord | null = null,
  storageOverride?: Pick<StorageService, 'publicUrl'>,
) {
  const updates: ProfileUpdate[] = [];
  const repo = {
    update: (_id: string, data: ProfileUpdate) => {
      updates.push(data);
      return Promise.resolve();
    },
    findPublicByUsername: () => Promise.resolve(publicUser),
  };
  const me = {
    getMe: () => Promise.resolve({ id: USER } as MeResponseDto),
  };
  const storage = storageOverride ?? {
    publicUrl: (key: string) => `https://cdn.example/${key}`,
  };
  const service = new ProfileService(
    repo as unknown as ProfileRepository,
    me as unknown as MeService,
    storage as StorageService,
  );
  return { service, updates };
}

const publicUser: PublicProfileRecord = {
  username: 'guest_1',
  displayName: 'Sardor',
  avatarKey: 'avatars/a.jpg',
  bio: 'Explorer',
  homeRegion: 'samarkand',
  showHomeRegion: false,
  level: 3,
  createdAt: AT,
  showStats: true,
  publicProfile: true,
  blockedAt: null,
  deletedAt: null,
};

const dto = (data: Partial<UpdateMeDto>): UpdateMeDto =>
  Object.assign(new UpdateMeDto(), data);

describe('ProfileService.updateMe (AC1)', () => {
  it('trims name and bio, clears empty values and writes region, interests and locale', async () => {
    const { service, updates } = setup();
    await service.updateMe(
      USER,
      dto({
        displayName: '  Sardor  ',
        bio: '  Explorer  ',
        homeRegion: 'samarkand',
        interests: ['peaks', 'lakes'],
        locale: 'ru',
      }),
    );
    expect(updates).toEqual([
      {
        displayName: 'Sardor',
        bio: 'Explorer',
        homeRegion: 'samarkand',
        interests: ['peaks', 'lakes'],
        locale: 'ru',
      },
    ]);

    await service.updateMe(
      USER,
      dto({ displayName: '   ', bio: '', homeRegion: null }),
    );
    expect(updates[1]).toEqual({
      displayName: null,
      bio: null,
      homeRegion: null,
    });
  });

  it('enforces the display-name and bio limits after trimming', async () => {
    const { service, updates } = setup();
    await expect(
      service.updateMe(USER, dto({ displayName: ' a ' })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { displayName: ['minLength'] },
    });
    await expect(
      service.updateMe(USER, dto({ displayName: 'x'.repeat(41) })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { displayName: ['maxLength'] },
    });
    await expect(
      service.updateMe(USER, dto({ bio: 'x'.repeat(151) })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { bio: ['maxLength'] },
    });
    expect(updates).toEqual([]);
  });

  it('rejects duplicate, too many and unknown interests; rejects an unknown locale', async () => {
    const { service, updates } = setup();
    const six = ['peaks', 'caves', 'lakes', 'camping', 'trails', 'peaks'];
    await expect(
      service.updateMe(USER, dto({ interests: ['peaks', 'peaks'] })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { interests: ['arrayUnique'] },
    });
    await expect(
      service.updateMe(USER, dto({ interests: six as InterestCode[] })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { interests: ['arrayMaxSize'] },
    });
    await expect(
      service.updateMe(
        USER,
        dto({ interests: ['photo'] as unknown as InterestCode[] }),
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { interests: ['isIn'] },
    });
    await expect(
      service.updateMe(USER, dto({ locale: 'fr' as never })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { locale: ['isIn'] },
    });
    expect(updates).toEqual([]);
  });
});

describe('ProfileService.getPublicProfile (AC1)', () => {
  it('returns the public fields and hides the home region unless the owner shares it', async () => {
    const { service } = setup(publicUser);
    expect(await service.getPublicProfile('GUEST_1')).toEqual({
      username: 'guest_1',
      displayName: 'Sardor',
      avatarUrl: 'https://cdn.example/avatars/a.jpg',
      bio: 'Explorer',
      homeRegion: null,
      level: 3,
      createdAt: AT.toISOString(),
      showStats: true,
    });

    const shared = setup({ ...publicUser, showHomeRegion: true });
    expect((await shared.service.getPublicProfile('guest_1')).homeRegion).toBe(
      'samarkand',
    );
  });

  it('answers PROFILE_NOT_FOUND for missing, deleted, blocked and private profiles', async () => {
    for (const publicRecord of [
      null,
      { ...publicUser, deletedAt: AT },
      { ...publicUser, blockedAt: AT },
      { ...publicUser, publicProfile: false },
    ]) {
      const { service } = setup(publicRecord);
      await expect(service.getPublicProfile('guest_1')).rejects.toMatchObject({
        code: 'PROFILE_NOT_FOUND',
        status: 404,
      });
    }
  });

  it('returns avatarUrl null when storage is unconfigured', async () => {
    const { service } = setup(publicUser, {
      publicUrl: () => {
        throw new StorageUnavailableError('NotConfigured');
      },
    });
    expect((await service.getPublicProfile('guest_1')).avatarUrl).toBeNull();
  });
});

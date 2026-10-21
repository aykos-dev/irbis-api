import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StorageUnavailableError } from '../../../lib/storage/storage.errors.js';
import type { StorageService } from '../../../lib/storage/storage.service.js';
import type { InterestCode } from '../../auth/auth.constants.js';
import { UsernameTakenError } from '../../auth/auth.errors.js';
import type { AuthService } from '../../auth/auth.service.js';
import type { MeService } from '../../auth/me.service.js';
import type { PasswordService } from '../../auth/password.service.js';
import { UpdateMeDto } from '../dto/profile.request.dto.js';
import type { MeResponseDto } from '../dto/profile.response.dto.js';
import { ProfileService } from '../profile.service.js';
import type {
  IdentityRecord,
  ProfileRepository,
  ProfileUpdate,
  PublicProfileRecord,
} from '../profile.repository.js';

const USER = 'user_1';
const SESSION = 'family_1';
const PASSWORD = 'tiger-lily-42';
const HASH = 'argon2-hash';
const AT = new Date('2026-10-21T10:00:00Z');

function setup(
  publicUser: PublicProfileRecord | null = null,
  options: {
    storage?: Pick<StorageService, 'publicUrl'>;
    identity?: IdentityRecord | null;
    passwordOk?: boolean;
    usernameTaken?: boolean;
  } = {},
) {
  const updates: ProfileUpdate[] = [];
  const changes: {
    userId: string;
    username: string;
    sessionId: string | undefined;
  }[] = [];
  const verifies: { hash: string; password: string }[] = [];
  const repo = {
    update: (_id: string, data: ProfileUpdate) => {
      updates.push(data);
      return Promise.resolve();
    },
    findPublicByUsername: () => Promise.resolve(publicUser),
    findIdentity: () =>
      Promise.resolve(
        options.identity === undefined
          ? { username: 'guest_1', passwordHash: HASH }
          : options.identity,
      ),
  };
  const me = {
    getMe: () => Promise.resolve({ id: USER } as MeResponseDto),
  };
  const auth = {
    changeUsername: (
      userId: string,
      username: string,
      sessionId: string | undefined,
    ) => {
      if (options.usernameTaken) {
        return Promise.reject(new UsernameTakenError());
      }
      changes.push({ userId, username, sessionId });
      return Promise.resolve();
    },
  };
  const passwords = {
    verify: (hash: string, password: string) => {
      verifies.push({ hash, password });
      return Promise.resolve(
        options.passwordOk === undefined
          ? password === PASSWORD
          : options.passwordOk,
      );
    },
  };
  const storage = options.storage ?? {
    publicUrl: (key: string) => `https://cdn.example/${key}`,
  };
  const service = new ProfileService(
    repo as unknown as ProfileRepository,
    me as unknown as MeService,
    storage as StorageService,
    auth as unknown as AuthService,
    passwords as unknown as PasswordService,
  );
  return { service, updates, changes, verifies };
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
      SESSION,
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
      SESSION,
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
      service.updateMe(USER, SESSION, dto({ displayName: ' a ' })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { displayName: ['minLength'] },
    });
    await expect(
      service.updateMe(USER, SESSION, dto({ displayName: 'x'.repeat(41) })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { displayName: ['maxLength'] },
    });
    await expect(
      service.updateMe(USER, SESSION, dto({ bio: 'x'.repeat(151) })),
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
      service.updateMe(USER, SESSION, dto({ interests: ['peaks', 'peaks'] })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { interests: ['arrayUnique'] },
    });
    await expect(
      service.updateMe(
        USER,
        SESSION,
        dto({ interests: six as InterestCode[] }),
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { interests: ['arrayMaxSize'] },
    });
    await expect(
      service.updateMe(
        USER,
        SESSION,
        dto({ interests: ['photo'] as unknown as InterestCode[] }),
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { interests: ['isIn'] },
    });
    await expect(
      service.updateMe(USER, SESSION, dto({ locale: 'fr' as never })),
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
      storage: {
        publicUrl: () => {
          throw new StorageUnavailableError('NotConfigured');
        },
      },
    });
    expect((await service.getPublicProfile('guest_1')).avatarUrl).toBeNull();
  });
});

describe('ProfileService.updateMe username change (AC2)', () => {
  it('stores the normalized username and keeps the caller session', async () => {
    const { service, changes, updates, verifies } = setup();
    await service.updateMe(
      USER,
      SESSION,
      dto({ username: '  New.Name ', currentPassword: PASSWORD }),
    );
    expect(changes).toEqual([
      { userId: USER, username: 'new.name', sessionId: SESSION },
    ]);
    expect(verifies).toEqual([{ hash: HASH, password: PASSWORD }]);
    expect(updates).toEqual([{}]);
  });

  it('treats the same normalized username as a no-op without a password', async () => {
    const { service, changes, verifies } = setup();
    await service.updateMe(USER, SESSION, dto({ username: 'GUEST_1' }));
    expect(changes).toEqual([]);
    expect(verifies).toEqual([]);
  });

  it('requires the current password and rejects a wrong one', async () => {
    const { service, changes } = setup();
    await expect(
      service.updateMe(USER, SESSION, dto({ username: 'new_name' })),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: { currentPassword: ['required'] },
    });
    await expect(
      service.updateMe(
        USER,
        SESSION,
        dto({ username: 'new_name', currentPassword: 'wrong' }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD', status: 401 });
    expect(changes).toEqual([]);
  });

  it('answers USERNAME_INVALID, USERNAME_RESERVED and USERNAME_TAKEN', async () => {
    const { service } = setup();
    await expect(
      service.updateMe(
        USER,
        SESSION,
        dto({ username: 'ab', currentPassword: PASSWORD }),
      ),
    ).rejects.toMatchObject({
      code: 'USERNAME_INVALID',
      fieldErrors: { username: ['tooShort'] },
    });
    await expect(
      service.updateMe(
        USER,
        SESSION,
        dto({ username: 'ad.min', currentPassword: PASSWORD }),
      ),
    ).rejects.toMatchObject({ code: 'USERNAME_RESERVED' });

    const taken = setup(null, { usernameTaken: true });
    await expect(
      taken.service.updateMe(
        USER,
        SESSION,
        dto({ username: 'new_name', currentPassword: PASSWORD }),
      ),
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN', status: 409 });
  });
});

describe('ProfileService.updateMe preferences (AC6)', () => {
  it('merges only the preference keys present', async () => {
    const { service, updates } = setup();
    await service.updateMe(
      USER,
      SESSION,
      dto({
        preferences: {
          showStats: false,
          units: 'imperial',
          notifications: { dailyGame: false, dailyGameTime: '20:30' },
          privacy: { findBuddies: false },
        },
      }),
    );
    expect(updates).toEqual([
      {
        showStats: false,
        units: 'imperial',
        notifyDailyGame: false,
        dailyGameTime: '20:30',
        findBuddies: false,
      },
    ]);
  });

  it('never writes tripSafety or shareLocation', async () => {
    const { service, updates } = setup();
    await service.updateMe(
      USER,
      SESSION,
      dto({
        preferences: {
          notifications: { tripSafety: false } as never,
          privacy: { shareLocation: 'never' } as never,
        },
      }),
    );
    expect(updates).toEqual([{}]);
  });

  it('validates units, appearance and the HH:MM daily time at the DTO', async () => {
    const good = plainToInstance(UpdateMeDto, {
      preferences: {
        units: 'imperial',
        appearance: 'dark',
        notifications: { dailyGameTime: '23:59' },
      },
    });
    expect(await validate(good)).toHaveLength(0);

    const bad = plainToInstance(UpdateMeDto, {
      preferences: {
        units: 'miles',
        appearance: 'blue',
        notifications: { dailyGameTime: '7:30' },
      },
    });
    const preferences = (await validate(bad)).find(
      (error) => error.property === 'preferences',
    );
    const children = preferences?.children ?? [];
    expect(
      children.find((c) => c.property === 'units')?.constraints,
    ).toHaveProperty('isIn');
    expect(
      children.find((c) => c.property === 'appearance')?.constraints,
    ).toHaveProperty('isIn');
    const notifications = children.find((c) => c.property === 'notifications');
    expect(notifications?.children?.[0]?.constraints).toHaveProperty('matches');
  });
});

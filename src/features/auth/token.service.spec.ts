import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../../config/app-config.js';
import {
  AccountBlockedError,
  RefreshInvalidError,
  RefreshReusedError,
} from './auth.errors.js';
import type { AuthRepository, RefreshRecord } from './auth.repository.js';
import { TokenService, hashRefreshToken } from './token.service.js';

type StoredToken = RefreshRecord & { tokenHash: string };

/** In-memory stand-in for the repository's refresh-token methods (the real ones run in e2e). */
class FakeTokens {
  rows: StoredToken[] = [];
  private seq = 0;

  createRefreshToken = (data: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> => {
    this.add(data);
    return Promise.resolve();
  };

  findRefreshByHash = (hash: string): Promise<RefreshRecord | null> =>
    Promise.resolve(this.rows.find((row) => row.tokenHash === hash) ?? null);

  rotateRefreshToken = (
    current: { id: string; userId: string; familyId: string },
    next: { tokenHash: string; expiresAt: Date },
    now: Date,
  ): Promise<boolean> => {
    const old = this.rows.find((row) => row.id === current.id);
    if (!old || old.revokedAt) return Promise.resolve(false);
    const created = this.add({ ...current, ...next });
    old.revokedAt = now;
    old.replacedById = created.id;
    return Promise.resolve(true);
  };

  revokeFamily = (familyId: string, now: Date): Promise<void> => {
    for (const row of this.rows) {
      if (row.familyId === familyId && !row.revokedAt) row.revokedAt = now;
    }
    return Promise.resolve();
  };

  revokeAllForUser = (userId: string, now: Date): Promise<void> => {
    for (const row of this.rows) {
      if (row.userId === userId && !row.revokedAt) row.revokedAt = now;
    }
    return Promise.resolve();
  };

  user = {
    id: 'user_1',
    role: 'user' as 'user' | 'admin',
    blockedAt: null as Date | null,
    blockReasonCode: null as 'spam' | null,
  };

  private add(data: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }): StoredToken {
    const row: StoredToken = {
      id: `rt_${++this.seq}`,
      userId: data.userId,
      familyId: data.familyId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      replacedById: null,
      user: this.user,
    };
    this.rows.push(row);
    return row;
  }
}

const secret = randomBytes(32).toString('hex');
const config = {
  jwtAccessSecret: secret,
  jwtAccessTtlSec: 900,
  refreshTtlDays: 30,
} as AppConfig;

function setup() {
  const store = new FakeTokens();
  const service = new TokenService(
    new JwtService(),
    config,
    store as unknown as AuthRepository,
  );
  return { store, service };
}

describe('TokenService refresh rotation (AC9)', () => {
  it('stores only a hash of the refresh token', async () => {
    const { store, service } = setup();
    const { refreshToken } = await service.startSession({
      id: 'user_1',
      role: 'user',
    });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].tokenHash).toBe(hashRefreshToken(refreshToken));
    expect(store.rows[0].tokenHash).not.toBe(refreshToken);
  });

  it('rotates: the old token dies, the new one lives in the same family', async () => {
    const { store, service } = setup();
    const first = await service.startSession({ id: 'user_1', role: 'user' });
    const second = await service.refresh(first.refreshToken, {
      requireAdmin: false,
    });

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(store.rows).toHaveLength(2);
    expect(store.rows[0].revokedAt).not.toBeNull();
    expect(store.rows[1].familyId).toBe(store.rows[0].familyId);
    await expect(
      service.refresh(second.refreshToken, { requireAdmin: false }),
    ).resolves.toMatchObject({ expiresIn: 900 });
  });

  it('reusing a rotated token revokes the whole family', async () => {
    const { store, service } = setup();
    const first = await service.startSession({ id: 'user_1', role: 'user' });
    const second = await service.refresh(first.refreshToken, {
      requireAdmin: false,
    });

    await expect(
      service.refresh(first.refreshToken, { requireAdmin: false }),
    ).rejects.toBeInstanceOf(RefreshReusedError);
    expect(store.rows.every((row) => row.revokedAt !== null)).toBe(true);
    await expect(
      service.refresh(second.refreshToken, { requireAdmin: false }),
    ).rejects.toBeInstanceOf(RefreshInvalidError);
  });

  it('rejects unknown and expired tokens', async () => {
    const { service } = setup();
    await expect(
      service.refresh('nope', { requireAdmin: false }),
    ).rejects.toBeInstanceOf(RefreshInvalidError);

    const issued = await service.startSession({ id: 'user_1', role: 'user' });
    const farFuture = new Date(Date.now() + 31 * 86_400_000);
    await expect(
      service.refresh(issued.refreshToken, { requireAdmin: false }, farFuture),
    ).rejects.toBeInstanceOf(RefreshInvalidError);
  });

  it('refuses a blocked user and ends all their sessions (AC11)', async () => {
    const { store, service } = setup();
    const issued = await service.startSession({ id: 'user_1', role: 'user' });
    store.user.blockedAt = new Date();
    store.user.blockReasonCode = 'spam';

    await expect(
      service.refresh(issued.refreshToken, { requireAdmin: false }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED', reasonCode: 'spam' });
    expect(store.rows.every((row) => row.revokedAt !== null)).toBe(true);
    await expect(
      service.refresh(issued.refreshToken, { requireAdmin: false }),
    ).rejects.toBeInstanceOf(AccountBlockedError);
  });

  it('admin refresh refuses a user without the admin role', async () => {
    const { service } = setup();
    const issued = await service.startSession({ id: 'user_1', role: 'user' });
    await expect(
      service.refresh(issued.refreshToken, { requireAdmin: true }),
    ).rejects.toBeInstanceOf(RefreshInvalidError);
  });

  it('revoke only ends tokens that belong to the caller', async () => {
    const { store, service } = setup();
    const issued = await service.startSession({ id: 'user_1', role: 'user' });
    expect(await service.revoke(issued.refreshToken, 'someone_else')).toBe(
      false,
    );
    expect(store.rows[0].revokedAt).toBeNull();
    expect(await service.revoke(issued.refreshToken, 'user_1')).toBe(true);
    expect(store.rows[0].revokedAt).not.toBeNull();
  });
});

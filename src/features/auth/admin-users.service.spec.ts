import { CannotBlockSelfError } from './auth.errors.js';
import { AdminUsersService } from './admin-users.service.js';
import type { AdminRepository } from './admin.repository.js';
import type { AuthRepository } from './auth.repository.js';
import type { PasswordService } from './password.service.js';
import type { PhoneCipher } from './phone-cipher.js';

describe('AdminUsersService.block', () => {
  it('refuses to block the calling admin before touching the database', async () => {
    const untouched = new Proxy(
      {},
      {
        get: () => {
          throw new Error('repository must not be used');
        },
      },
    );
    const service = new AdminUsersService(
      untouched as AuthRepository,
      untouched as AdminRepository,
      untouched as PasswordService,
      untouched as PhoneCipher,
    );
    await expect(
      service.block('admin_1', 'admin_1', { reasonCode: 'spam', note: 'x' }),
    ).rejects.toBeInstanceOf(CannotBlockSelfError);
  });
});

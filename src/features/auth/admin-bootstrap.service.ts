import { Injectable } from '@nestjs/common';
import { AuthRepository } from './auth.repository.js';
import { PasswordService } from './password.service.js';
import { normalizeUsername, usernameProblem } from './username.rules.js';

export type BootstrapOutcome =
  | { kind: 'created'; username: string }
  | { kind: 'promoted'; username: string }
  | { kind: 'already_admin'; username: string };

export class BootstrapError extends Error {}

/**
 * Backs `npm run admin:create`: the only way an admin account comes into being (AC16).
 * Reserved names (admin, support, ...) are allowed here because the public API can never take them.
 */
@Injectable()
export class AdminBootstrapService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
  ) {}

  /** The normalized username when it is well-formed, else a BootstrapError. */
  checkUsername(raw: string): string {
    const username = normalizeUsername(raw);
    const problem = usernameProblem(username);
    if (problem && problem !== 'reserved') {
      throw new BootstrapError(`Username is not valid (${problem})`);
    }
    return username;
  }

  async exists(username: string): Promise<boolean> {
    return this.repository.usernameExists(username);
  }

  /** Creates the admin, or promotes the existing user of that name (their password is kept). */
  async createOrPromote(
    rawUsername: string,
    password: string | null,
  ): Promise<BootstrapOutcome> {
    const username = this.checkUsername(rawUsername);
    const existing = await this.repository.findByUsername(username);

    if (existing) {
      if (existing.role === 'admin') return { kind: 'already_admin', username };
      if (existing.blockedAt) {
        throw new BootstrapError(
          'That user is blocked; unblock them in the admin panel first',
        );
      }
      await this.repository.setRole(existing.id, 'admin');
      return { kind: 'promoted', username };
    }

    if (password === null) {
      throw new BootstrapError(
        'A password is required to create a new account',
      );
    }
    this.passwords.assertAcceptable(password, username);
    const user = await this.repository.createUser({
      username,
      passwordHash: await this.passwords.hash(password),
      locale: 'en',
      termsAcceptedAt: new Date(),
    });
    await this.repository.setRole(user.id, 'admin');
    return { kind: 'created', username };
  }
}

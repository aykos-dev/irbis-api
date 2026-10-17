import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { AppConfig } from '../../config/app-config.js';
import { loadCommonPasswords } from './common-passwords.js';
import { PasswordWeakError } from './auth.errors.js';
import { passwordProblem } from './password.rules.js';

/** Argon2id hashing (per-hash random salt, cost from config) and the password policy. */
@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  constructor(private readonly config: AppConfig) {}

  hash(password: string): Promise<string> {
    return hash(password, this.config.argon2);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }

  /** Spends the same time as a real check so an unknown username is not faster to reject. */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash('dummy-password-for-timing');
    await verify(await this.dummyHash, password);
  }

  /** Throws PASSWORD_WEAK (with `fieldErrors[field]`) when the policy is not met. */
  assertAcceptable(
    password: string,
    username: string,
    field = 'password',
  ): void {
    const problem = passwordProblem(password, username, loadCommonPasswords());
    if (problem) throw new PasswordWeakError(problem, field);
  }
}

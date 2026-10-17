import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository, type UserRecord } from './auth.repository.js';
import type { MeResponseDto } from './dto/me.response.dto.js';

/** The signed-in user's own profile view. */
@Injectable()
export class MeService {
  constructor(private readonly repository: AuthRepository) {}

  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.toMe(user, new Date());
  }

  async toMe(user: UserRecord, now: Date): Promise<MeResponseDto> {
    return {
      id: user.id,
      username: user.username,
      locale: user.locale,
      role: user.role,
      hasRecoveryPhone:
        user.recoveryPhone !== null && user.recoveryPhoneVerifiedAt !== null,
      recoveryPhonePending: await this.repository.hasPendingPhoneCode(
        user.id,
        now,
      ),
      createdAt: user.createdAt.toISOString(),
    };
  }
}

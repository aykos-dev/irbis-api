import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../../config/app-config.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminRepository } from './admin.repository.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { GuestMergeRegistry } from './guest-merge/guest-merge.registry.js';
import { GuestMergeService } from './guest-merge/guest-merge.service.js';
import { OnboardingMergeHandler } from './guest-merge/onboarding-merge.handler.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';
import { PasswordService } from './password.service.js';
import { PhoneCipher } from './phone-cipher.js';
import { RecoveryService } from './recovery.service.js';
import { FakeSmsSender, SmsSender } from './sms-sender.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [
    AuthController,
    MeController,
    AdminAuthController,
    AdminUsersController,
  ],
  providers: [
    AuthRepository,
    AdminRepository,
    AuthService,
    AdminUsersService,
    AdminBootstrapService,
    MeService,
    PasswordService,
    PhoneCipher,
    RecoveryService,
    TokenService,
    GuestMergeRegistry,
    GuestMergeService,
    OnboardingMergeHandler,
    {
      provide: SmsSender,
      inject: [AppConfig],
      useFactory: (config: AppConfig): SmsSender => {
        switch (config.smsProvider) {
          case 'fake':
            return new FakeSmsSender(config);
        }
      },
    },
  ],
  // GuestMergeRegistry: later features register their guest-data handlers (AC8).
  // AuthService: the global account-status guard. AdminBootstrapService: the admin:create CLI.
  exports: [AuthService, GuestMergeRegistry, AdminBootstrapService],
})
export class AuthModule {}

import {
  ClassSerializerInterceptor,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { RequestValidationError } from './common/errors/validation.error.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { skipUnlessThrottled } from './common/decorators/throttle.decorator.js';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AppConfig } from './config/app-config.js';
import { AppConfigModule } from './config/config.module.js';
import { AccountStatusGuard } from './features/auth/guards/account-status.guard.js';
import { AuthModule } from './features/auth/auth.module.js';
import { PlacesModule } from './features/places/places.module.js';
import { HealthModule } from './health/health.module.js';
import { loggerParams } from './logging.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: loggerParams,
    }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.throttle.ttlMs,
            limit: config.throttle.limit,
          },
          {
            name: 'auth',
            ttl: config.authThrottle.ttlMs,
            limit: config.authThrottle.limit,
            skipIf: skipUnlessThrottled('auth'),
          },
          {
            name: 'lookup',
            ttl: config.lookupThrottle.ttlMs,
            limit: config.lookupThrottle.limit,
            skipIf: skipUnlessThrottled('lookup'),
          },
        ],
      }),
    }),
    JwtModule.register({}),
    PrismaModule,
    HealthModule,
    AuthModule,
    PlacesModule,
  ],
  providers: [
    // Guards run in this order: rate limit → authentication → account status (blocked, current role) → roles.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccountStatusGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) =>
          RequestValidationError.fromValidationErrors(errors),
      }),
    },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}

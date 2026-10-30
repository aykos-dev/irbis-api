import {
  ClassSerializerInterceptor,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
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
import { BadgesModule } from './features/badges/badges.module.js';
import { CheckInModule } from './features/check-in/check-in.module.js';
import { ConditionsModule } from './features/conditions/conditions.module.js';
import { LessonsAdminModule } from './features/lessons-admin/lessons-admin.module.js';
import { LessonsModule } from './features/lessons/lessons.module.js';
import { LevelsModule } from './features/levels/levels.module.js';
import { StreaksModule } from './features/streaks/streaks.module.js';
import { PlacesModule } from './features/places/places.module.js';
import { ProfileModule } from './features/profile/profile.module.js';
import { TripPlanModule } from './features/trip-plan/trip-plan.module.js';
import { WeeklyPathModule } from './features/weekly-path/weekly-path.module.js';
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
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    BadgesModule,
    PlacesModule,
    ConditionsModule,
    LevelsModule,
    LessonsAdminModule,
    LessonsModule,
    ProfileModule,
    WeeklyPathModule,
    TripPlanModule,
    CheckInModule,
    StreaksModule,
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

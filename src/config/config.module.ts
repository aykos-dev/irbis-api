import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './app-config.js';
import { validateEnv } from './config.schema.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      // Local development reads the git-ignored env file; real environment variables win.
      envFilePath: '.env',
      validate: validateEnv,
      cache: true,
    }),
  ],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}

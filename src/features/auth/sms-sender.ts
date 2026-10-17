import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import type { SmsPurposeCode } from './auth.constants.js';

export interface SmsMessage {
  userId: string;
  phone: string;
  code: string;
  purpose: SmsPurposeCode;
}

/** Delivers one-time codes. A real provider adapter is added later; it must not log codes or phones. */
export abstract class SmsSender {
  abstract send(message: SmsMessage): Promise<void>;
}

/**
 * Local/test only: writes the code to the API log instead of sending it. Refuses to be built
 * in staging or production (config validation also stops the boot in those environments).
 */
@Injectable()
export class FakeSmsSender extends SmsSender {
  private readonly logger = new Logger(FakeSmsSender.name);

  constructor(config: AppConfig) {
    super();
    if (
      config.appEnv === 'staging' ||
      config.appEnv === 'prod' ||
      config.nodeEnv === 'production'
    ) {
      throw new Error('FakeSmsSender cannot be used in staging or production');
    }
  }

  send(message: SmsMessage): Promise<void> {
    this.logger.log(`SMS code for user ${message.userId}: ${message.code}`);
    return Promise.resolve();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import type { SmsPurposeCode } from './auth.constants.js';

export interface SmsMessage {
  userId: string;
  phone: string;
  code: string;
  purpose: SmsPurposeCode;
}

/** A free-text SMS (trip-plan alert to the emergency contact). */
export interface SmsTextMessage {
  userId: string;
  phone: string;
  text: string;
}

/**
 * Delivers one-time codes and plain texts. A real provider adapter is added later; it must not
 * log codes, phones or texts.
 */
export abstract class SmsSender {
  abstract send(message: SmsMessage): Promise<void>;
  abstract sendText(message: SmsTextMessage): Promise<void>;
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

  /** The text may carry a name and a location: only its length is logged. */
  sendText(message: SmsTextMessage): Promise<void> {
    this.logger.log(
      `SMS text for user ${message.userId} (${message.text.length} chars)`,
    );
    return Promise.resolve();
  }
}

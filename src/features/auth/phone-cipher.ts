import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import { decryptField, encryptField } from '../../lib/field-cipher.js';

/** Encrypts recovery phones at rest. Plain phones exist only in memory, never in logs. */
@Injectable()
export class PhoneCipher {
  constructor(private readonly config: AppConfig) {}

  encrypt(phone: string): string {
    return encryptField(this.config.phoneEncryptionKey, phone);
  }

  decrypt(stored: string): string {
    return decryptField(this.config.phoneEncryptionKey, stored);
  }
}

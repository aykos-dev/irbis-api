import { Injectable } from '@nestjs/common';

/**
 * One kind of guest data a feature knows how to move into the account (AC8).
 * A feature registers its handler in `onModuleInit` and adds the matching optional
 * property to `GuestMergeDto`; `key` is that property's name.
 */
export interface GuestMergeHandler {
  readonly key: string;
  /** Applies the guest's value to the account. Must be safe to run twice. */
  merge(userId: string, value: unknown): Promise<void>;
}

@Injectable()
export class GuestMergeRegistry {
  private readonly handlers = new Map<string, GuestMergeHandler>();

  register(handler: GuestMergeHandler): void {
    if (this.handlers.has(handler.key)) {
      throw new Error(`Guest merge handler already registered: ${handler.key}`);
    }
    this.handlers.set(handler.key, handler);
  }

  get(key: string): GuestMergeHandler | undefined {
    return this.handlers.get(key);
  }
}

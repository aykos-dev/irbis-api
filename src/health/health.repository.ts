import { Injectable } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';

/** Upper bound for the database ping; /health never hangs longer than this (AC2). */
export const DB_PING_TIMEOUT_MS = 3_000;

@Injectable()
export class HealthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  /** `SELECT 1` through Prisma; false when it fails or exceeds DB_PING_TIMEOUT_MS. */
  async isDatabaseUp(): Promise<boolean> {
    const result = await this.prismaIndicator
      .pingCheck('db', this.prisma)
      .withTimeout(DB_PING_TIMEOUT_MS);
    return result.db.status === 'up';
  }
}

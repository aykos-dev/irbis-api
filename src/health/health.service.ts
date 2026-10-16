import { Injectable } from '@nestjs/common';
import { packageVersion } from '../config/package-version.js';
import {
  DependencyStatus,
  HealthStatus,
  type HealthResponseDto,
} from './dto/health.response.dto.js';
import { HealthRepository } from './health.repository.js';

@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check(): Promise<HealthResponseDto> {
    const dbUp = await this.repository.isDatabaseUp();
    return {
      status: dbUp ? HealthStatus.Ok : HealthStatus.Degraded,
      db: dbUp ? DependencyStatus.Up : DependencyStatus.Down,
      version: packageVersion,
      time: new Date().toISOString(),
    };
  }
}

import {
  type CanActivate,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';

/** QA routes exist only when QA_TOOLS_ENABLED=true; otherwise they answer like an unknown route. */
@Injectable()
export class QaToolsGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(): boolean {
    if (!this.config.qaToolsEnabled) throw new NotFoundException();
    return true;
  }
}

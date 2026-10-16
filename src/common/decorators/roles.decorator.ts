import { SetMetadata } from '@nestjs/common';
import type { Role } from '../auth-user.js';

export const ROLES_KEY = 'roles';

/** Restricts a route to callers holding one of the given roles. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

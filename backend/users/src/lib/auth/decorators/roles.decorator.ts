import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const REQUIRED_ROLES = 'requiredRoles';
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES, roles);

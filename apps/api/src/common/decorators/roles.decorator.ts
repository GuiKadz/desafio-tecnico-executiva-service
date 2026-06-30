import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

/**
 * Restringe o acesso à rota aos papéis informados.
 * Uso: @Roles(Role.ADMIN)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

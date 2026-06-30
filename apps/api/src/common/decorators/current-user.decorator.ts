import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPayload } from '../types/auth.types';

/**
 * Extrai o usuário autenticado (payload do JWT) anexado pela JwtStrategy.
 * Uso: @CurrentUser() user: CurrentUserPayload
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;
    return data ? user?.[data] : user;
  },
);

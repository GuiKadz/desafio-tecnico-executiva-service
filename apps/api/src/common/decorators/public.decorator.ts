import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como pública, ignorando o JwtAuthGuard global.
 * Uso: @Public() no controller ou no handler.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

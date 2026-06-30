import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/types/auth.types';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const BCRYPT_SALT_ROUNDS = 10;

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  role: 'ADMIN' | 'VIEWER';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenJwtPayload {
  sub: string; // userId
  jti: string; // id do registro RefreshToken no banco
}

/**
 * Centraliza a emissão e rotação de tokens JWT.
 *
 * Estratégia de refresh token rotation com detecção de reuso:
 * - Cada refresh token emitido corresponde a UMA linha em `RefreshToken`,
 *   identificada por `jti` (claim do JWT = id da linha).
 * - O valor bruto do JWT nunca é salvo em texto plano: apenas seu hash
 *   bcrypt é persistido (`tokenHash`).
 * - A cada uso bem-sucedido, o token é marcado como `revoked = true` e um
 *   novo par de tokens é emitido (rotation).
 * - Se um token já revogado for apresentado novamente, isso indica que o
 *   token original vazou e foi usado por duas partes (reuso) — nesse caso,
 *   TODAS as sessões (refresh tokens) do usuário são revogadas
 *   imediatamente, forçando novo login em todos os dispositivos.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  generateAccessToken(user: AuthenticatedUser): string {
    const payload: CurrentUserPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  async generateRefreshToken(user: AuthenticatedUser): Promise<string> {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const payload: RefreshTokenJwtPayload = { sub: user.id, jti: id };
    const rawToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });

    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_SALT_ROUNDS);

    await this.prisma.refreshToken.create({
      data: { id, tokenHash, expiresAt, userId: user.id },
    });

    return rawToken;
  }

  async issueTokenPair(user: AuthenticatedUser): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return { accessToken, refreshToken };
  }

  /**
   * Valida, revoga e rotaciona um refresh token, emitindo um novo par.
   * Lança UnauthorizedException se o token for inválido, expirado, ou já
   * tiver sido usado anteriormente (reuso detectado).
   */
  async rotateRefreshToken(rawToken: string): Promise<TokenPair> {
    let payload: RefreshTokenJwtPayload;

    try {
      payload = this.jwt.verify<RefreshTokenJwtPayload>(rawToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });

    if (!record || record.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (record.revoked) {
      // Reuso detectado: o token já tinha sido rotacionado/revogado antes.
      // Por segurança, revoga TODAS as sessões deste usuário.
      await this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revoked: false },
        data: { revoked: true },
      });
      throw new UnauthorizedException(
        'Reuso de refresh token detectado — todas as sessões foram revogadas',
      );
    }

    const matches = await bcrypt.compare(rawToken, record.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Rotation: revoga o token atual antes de emitir um novo.
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    });

    const user: AuthenticatedUser = {
      id: record.user.id,
      email: record.user.email,
      tenantId: record.user.tenantId,
      role: record.user.role,
    };

    return this.issueTokenPair(user);
  }
}

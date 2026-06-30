import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/types/auth.types';

const BCRYPT_SALT_ROUNDS = 10;

function asExpiresIn(value: string): JwtSignOptions['expiresIn'] {
  return value as JwtSignOptions['expiresIn'];
}

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
      expiresIn: asExpiresIn(this.config.get<string>('JWT_ACCESS_TTL', '15m')),
    });
  }

  async generateRefreshToken(user: AuthenticatedUser): Promise<string> {
    const id = randomUUID();

    const payload: RefreshTokenJwtPayload = { sub: user.id, jti: id };
    const rawToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: asExpiresIn(this.config.get<string>('JWT_REFRESH_TTL', '7d')),
    });

    const decoded = this.jwt.decode<{ exp: number }>(rawToken);
    const expiresAt = new Date(decoded.exp * 1000);

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

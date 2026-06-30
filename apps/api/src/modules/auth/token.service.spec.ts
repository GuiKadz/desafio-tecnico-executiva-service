import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService, AuthenticatedUser } from './token.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn((value: string) => Promise.resolve(`hashed:${value}`)),
  compare: jest.fn((value: string, hash: string) =>
    Promise.resolve(hash === `hashed:${value}`),
  ),
}));

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwt: JwtService;

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@acme.com',
    tenantId: 'tenant-1',
    role: 'ADMIN',
  };

  let db: Record<
    string,
    {
      id: string;
      tokenHash: string;
      expiresAt: Date;
      revoked: boolean;
      userId: string;
    }
  >;

  const prismaMock = {
    refreshToken: {
      create: jest.fn(({ data }: any) => {
        db[data.id] = { ...data, revoked: false };
        return Promise.resolve(db[data.id]);
      }),
      findUnique: jest.fn(({ where }: any) => {
        const record = db[where.id];
        if (!record) return Promise.resolve(null);
        return Promise.resolve({ ...record, user });
      }),
      update: jest.fn(({ where, data }: any) => {
        db[where.id] = { ...db[where.id], ...data };
        return Promise.resolve(db[where.id]);
      }),
      updateMany: jest.fn(({ where, data }: any) => {
        Object.keys(db).forEach((id) => {
          if (db[id].userId === where.userId && db[id].revoked === false) {
            db[id] = { ...db[id], ...data };
          }
        });
        return Promise.resolve();
      }),
    },
  };

  beforeEach(async () => {
    db = {};

    const configMock = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        throw new Error(`Env não mockada: ${key}`);
      }),
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_ACCESS_TTL') return defaultValue ?? '15m';
        if (key === 'JWT_REFRESH_TTL') return defaultValue ?? '7d';
        return defaultValue;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        TokenService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    tokenService = moduleRef.get(TokenService);
    jwt = moduleRef.get(JwtService);
    jest.clearAllMocks();
  });

  it('emite um par access+refresh válido', async () => {
    const pair = await tokenService.issueTokenPair(user);

    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();

    const decoded = jwt.decode(pair.accessToken);
    expect(decoded.sub).toBe(user.id);
    expect(decoded.tenantId).toBe(user.tenantId);
  });

  it('rotaciona o refresh token e revoga o anterior', async () => {
    const first = await tokenService.issueTokenPair(user);

    const rotated = await tokenService.rotateRefreshToken(first.refreshToken);

    expect(rotated.refreshToken).not.toBe(first.refreshToken);

    const firstPayload = jwt.decode(first.refreshToken);
    expect(db[firstPayload.jti].revoked).toBe(true);
  });

  it('detecta reuso de refresh token já revogado e revoga todas as sessões', async () => {
    const first = await tokenService.issueTokenPair(user);

    await tokenService.rotateRefreshToken(first.refreshToken);

    await expect(
      tokenService.rotateRefreshToken(first.refreshToken),
    ).rejects.toThrow(UnauthorizedException);

    const allRevoked = Object.values(db)
      .filter((r) => r.userId === user.id)
      .every((r) => r.revoked === true);
    expect(allRevoked).toBe(true);
  });

  it('rejeita refresh token inválido/malformado', async () => {
    await expect(
      tokenService.rotateRefreshToken('token-invalido'),
    ).rejects.toThrow(UnauthorizedException);
  });
});

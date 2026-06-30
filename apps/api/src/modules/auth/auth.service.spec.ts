import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../../generated/prisma/enums';

jest.mock('bcryptjs', () => ({
  hash: jest.fn((value: string) => Promise.resolve(`hashed:${value}`)),
  compare: jest.fn((value: string, hash: string) =>
    Promise.resolve(hash === `hashed:${value}`),
  ),
}));
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;

  const prismaMock = {
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: any) => callback(prismaMock) as Promise<any>,
    ),
  };

  const tokenServiceMock = {
    issueTokenPair: jest.fn(() =>
      Promise.resolve({ accessToken: 'access', refreshToken: 'refresh' }),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TokenService, useValue: tokenServiceMock },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('createUser — isolamento multi-tenant', () => {
    it('cria o usuário sempre vinculado ao tenantId do chamador, nunca a um valor arbitrário', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.user.create.mockImplementationOnce(({ data }: any) =>
        Promise.resolve({ id: 'new-user', ...data }),
      );

      const callerTenantId = 'tenant-A';
      const result = await authService.createUser(
        {
          name: 'Novo',
          email: 'novo@a.com',
          password: 'senhasegura1',
          role: Role.VIEWER,
        },
        callerTenantId,
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: callerTenantId }),
        }),
      );
      expect(result.tenantId).toBe(callerTenantId);

      expect('password' in result).toBe(false);
    });

    it('rejeita criação de usuário com e-mail já existente (mesmo de outro tenant)', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        authService.createUser(
          {
            name: 'X',
            email: 'dup@a.com',
            password: 'senhasegura1',
            role: Role.VIEWER,
          },
          'tenant-A',
        ),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('onboarding', () => {
    it('rejeita slug de tenant duplicado', async () => {
      prismaMock.tenant.findUnique.mockResolvedValueOnce({
        id: 'existing-tenant',
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        authService.onboarding({
          tenantName: 'Acme',
          tenantSlug: 'acme',
          adminName: 'Admin',
          adminEmail: 'admin@acme.com',
          adminPassword: 'senhasegura1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('rejeita credenciais com senha incorreta', async () => {
      const passwordHash = await bcrypt.hash('senha-correta', 10);
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@a.com',
        password: passwordHash,
        tenantId: 't1',
        role: Role.VIEWER,
      });

      await expect(
        authService.login({ email: 'a@a.com', password: 'senha-errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService, TokenPair } from './token.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../../../generated/prisma/enums';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Onboarding: cria um novo tenant junto com seu usuário administrador
   * inicial em uma única transação. Garante unicidade do slug do tenant e
   * do e-mail do admin.
   */
  async onboarding(dto: OnboardingDto): Promise<TokenPair> {
    const [existingTenant, existingUser] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } }),
      this.prisma.user.findUnique({ where: { email: dto.adminEmail } }),
    ]);

    if (existingTenant) {
      throw new ConflictException('Já existe um tenant com este slug');
    }
    if (existingUser) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const passwordHash = await bcrypt.hash(
      dto.adminPassword,
      BCRYPT_SALT_ROUNDS,
    );

    const { tenant, admin } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenantName, slug: dto.tenantSlug },
      });

      const admin = await tx.user.create({
        data: {
          name: dto.adminName,
          email: dto.adminEmail,
          password: passwordHash,
          role: Role.ADMIN,
          tenantId: tenant.id,
        },
      });

      return { tenant, admin };
    });

    return this.tokens.issueTokenPair({
      id: admin.id,
      email: admin.email,
      tenantId: tenant.id,
      role: admin.role,
    });
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.tokens.issueTokenPair({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    return this.tokens.rotateRefreshToken(rawRefreshToken);
  }

  /**
   * Cria um novo usuário (Admin ou Viewer) dentro do MESMO tenant do
   * usuário autenticado. O tenantId nunca vem do corpo da requisição —
   * sempre do token do usuário logado — para impedir vazamento entre
   * tenants (multi-tenancy real).
   */
  async createUser(dto: CreateUserDto, tenantId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: passwordHash,
        role: dto.role,
        tenantId,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}

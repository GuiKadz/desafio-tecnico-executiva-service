import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CookieRefreshToken } from '../../common/decorators/cookie-refresh-token.decorator';
import { Role } from '../../../generated/prisma/enums';

const REFRESH_COOKIE_NAME = 'refreshToken';
// O cookie só é enviado de volta ao servidor em requisições para /auth/*,
// reduzindo a superfície de exposição (CSRF-relevant routes only).
const REFRESH_COOKIE_PATH = '/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  /**
   * `secure` é controlado por COOKIE_SECURE (não por NODE_ENV): a imagem
   * Docker roda com NODE_ENV=production mesmo no ambiente de demo local
   * em HTTP puro, e um cookie `secure: true` nesse cenário seria
   * silenciosamente descartado pelo browser, quebrando o login. Em um
   * deploy real atrás de HTTPS, basta setar COOKIE_SECURE=true.
   */
  private isCookieSecure(): boolean {
    return this.config.get<string>('COOKIE_SECURE', 'false') === 'true';
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.isCookieSecure(),
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: this.tokens.getRefreshCookieMaxAgeMs(),
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isCookieSecure(),
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('onboarding')
  @ApiOperation({
    summary: 'Cria um novo tenant e seu usuário administrador inicial',
  })
  @ApiResponse({
    status: 201,
    description:
      'Tenant e admin criados. Retorna o access token; o refresh token é emitido como cookie httpOnly.',
  })
  @ApiResponse({
    status: 409,
    description: 'Slug de tenant ou e-mail já em uso',
  })
  async onboarding(
    @Body() dto: OnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.onboarding(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Autentica um usuário. Retorna o access token; o refresh token é emitido como cookie httpOnly.',
  })
  @ApiResponse({ status: 200, description: 'Autenticado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Rotaciona o refresh token (lido do cookie httpOnly) e emite um novo access token + cookie',
  })
  @ApiResponse({ status: 200, description: 'Novo par de tokens emitido' })
  @ApiResponse({
    status: 401,
    description:
      'Refresh token ausente, inválido, expirado ou já revogado (reuse detection)',
  })
  async refresh(
    @CookieRefreshToken() refreshTokenCookie: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!refreshTokenCookie) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    try {
      const { accessToken, refreshToken } =
        await this.authService.refresh(refreshTokenCookie);
      this.setRefreshCookie(res, refreshToken);
      return { accessToken };
    } catch (error) {
      // Cookie inválido/reusado: limpa do browser para forçar novo login.
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoga o refresh token atual e limpa o cookie de sessão',
  })
  @ApiResponse({ status: 204, description: 'Sessão encerrada' })
  async logout(
    @CookieRefreshToken() refreshTokenCookie: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (refreshTokenCookie) {
      await this.tokens.revokeRefreshToken(refreshTokenCookie);
    }
    this.clearRefreshCookie(res);
  }

  @Post('users')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cria um novo usuário (Admin ou Viewer) dentro do tenant do admin autenticado',
  })
  @ApiResponse({ status: 201, description: 'Usuário criado' })
  @ApiResponse({ status: 409, description: 'E-mail já em uso' })
  createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.authService.createUser(dto, tenantId);
  }

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Lista os usuários do tenant' })
  @ApiResponse({ status: 200, description: 'Lista de usuários' })
  listUsers(@CurrentUser('tenantId') tenantId: string) {
    return this.authService.listUsers(tenantId);
  }

  @Delete('users/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '[Admin] Remove um usuário do tenant (não permite remover a si mesmo nem o último admin)',
  })
  @ApiResponse({ status: 204, description: 'Usuário removido' })
  @ApiResponse({ status: 403, description: 'Auto-remoção ou último admin' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  removeUser(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') requesterId: string,
  ) {
    return this.authService.removeUser(id, tenantId, requesterId);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Troca a senha do próprio usuário autenticado' })
  @ApiResponse({ status: 204, description: 'Senha alterada' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}

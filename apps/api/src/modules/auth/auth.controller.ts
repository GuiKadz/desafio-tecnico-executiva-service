import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma/enums';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('onboarding')
  @ApiOperation({
    summary: 'Cria um novo tenant e seu usuário administrador inicial',
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant e admin criados, retorna tokens',
  })
  @ApiResponse({
    status: 409,
    description: 'Slug de tenant ou e-mail já em uso',
  })
  onboarding(@Body() dto: OnboardingDto) {
    return this.authService.onboarding(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica um usuário e retorna access+refresh tokens',
  })
  @ApiResponse({ status: 200, description: 'Autenticado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotaciona o refresh token e emite um novo par access+refresh',
  })
  @ApiResponse({ status: 200, description: 'Novo par de tokens emitido' })
  @ApiResponse({
    status: 401,
    description:
      'Refresh token inválido, expirado ou já revogado (reuse detection)',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
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
}

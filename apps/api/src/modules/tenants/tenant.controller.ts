import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Retorna os dados do tenant do usuário autenticado',
  })
  getMe(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantService.findById(tenantId);
  }
}

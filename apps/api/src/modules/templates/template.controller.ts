import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma/enums';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Cria uma nova versão do template de contrato do tenant (desativa a anterior, sem alterá-la)',
  })
  create(
    @Body() dto: CreateTemplateDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.templateService.createVersion(dto, tenantId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Retorna o template ativo do tenant' })
  findActive(@CurrentUser('tenantId') tenantId: string) {
    return this.templateService.findActive(tenantId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista todas as versões de template do tenant' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.templateService.findAll(tenantId);
  }
}

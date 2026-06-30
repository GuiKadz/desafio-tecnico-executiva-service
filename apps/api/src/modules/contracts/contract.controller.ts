import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractFieldsDto } from './dto/update-contract-fields.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { FindContractsQueryDto } from './dto/find-contracts-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: '[Admin] Cria um contrato a partir do template ativo do tenant',
  })
  create(
    @Body() dto: CreateContractDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.contractService.create(dto, tenantId, userId);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista contratos do tenant, paginado, com filtro por status/data e busca por valor de campo',
  })
  findAll(
    @Query() query: FindContractsQueryDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.contractService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um contrato, com valores e histórico' })
  findOne(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.contractService.findOne(id, tenantId);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      '[Admin] Avança o status do contrato (Rascunho → Ativo → Encerrado)',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContractStatusDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.contractService.updateStatus(id, tenantId, dto.status, userId);
  }

  @Patch(':id/fields')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: '[Admin] Edita valores de campos de um contrato em Rascunho',
  })
  updateFields(
    @Param('id') id: string,
    @Body() dto: UpdateContractFieldsDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.contractService.updateFields(id, tenantId, dto, userId);
  }
}

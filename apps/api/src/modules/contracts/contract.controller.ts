import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractFieldsDto } from './dto/update-contract-fields.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria um contrato a partir do template ativo do tenant',
  })
  create(
    @Body() dto: CreateContractDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.contractService.create(dto, tenantId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um contrato, com valores e histórico' })
  findOne(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.contractService.findOne(id, tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Avança o status do contrato (Rascunho → Ativo → Encerrado)',
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
  @ApiOperation({
    summary: 'Edita valores de campos de um contrato em Rascunho',
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

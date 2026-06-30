import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HistoryService } from './history.service';
import { FindHistoryQueryDto } from './dto/find-history-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('history')
@ApiBearerAuth()
@Controller('contracts/:contractId/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({
    summary:
      'Histórico paginado de um contrato, filtrável por tipo de ação (CREATED, STATUS_CHANGED, FIELD_UPDATED)',
  })
  findByContract(
    @Param('contractId') contractId: string,
    @Query() query: FindHistoryQueryDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.historyService.findByContract(contractId, tenantId, query);
  }
}

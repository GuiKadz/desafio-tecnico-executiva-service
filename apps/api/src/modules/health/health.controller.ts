import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Usado pelo healthcheck do Docker Compose. Diferente de checar /docs
   * (que só prova que o processo Nest subiu), aqui confirmamos que a
   * aplicação realmente consegue falar com o Postgres.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Verifica se a api e o banco estão saudáveis' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error' });
    }
  }
}

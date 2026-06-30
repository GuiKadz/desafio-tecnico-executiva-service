import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FindHistoryQueryDto } from './dto/find-history-query.dto';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findByContract(
    contractId: string,
    tenantId: string,
    query: FindHistoryQueryDto,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, tenantId },
      select: { id: true },
    });
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const { page, limit, action } = query;
    const where = {
      contractId,
      ...(action ? { action } : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.contractHistory.count({ where }),
      this.prisma.contractHistory.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          changedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

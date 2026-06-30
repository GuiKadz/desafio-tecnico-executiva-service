import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: {
          select: { users: true, contracts: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return tenant;
  }

  async stats(tenantId: string) {
    const [byStatus, recentContracts] = await Promise.all([
      this.prisma.contract.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.contract.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, status: true, createdAt: true, updatedAt: true },
      }),
    ]);

    const counts: Record<'DRAFT' | 'ACTIVE' | 'CLOSED', number> = {
      DRAFT: 0,
      ACTIVE: 0,
      CLOSED: 0,
    };
    for (const group of byStatus) {
      counts[group.status] = group._count._all;
    }

    return { byStatus: counts, recentContracts };
  }
}

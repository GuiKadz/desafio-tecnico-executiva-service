import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova versão do template do tenant. Nunca edita uma versão
   * existente: a anterior é apenas desativada, preservando os contratos já
   * gerados a partir dela (edição não retroativa).
   */
  async createVersion(dto: CreateTemplateDto, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.contractTemplate.findFirst({
        where: { tenantId, isActive: true },
      });

      if (current) {
        await tx.contractTemplate.update({
          where: { id: current.id },
          data: { isActive: false },
        });
      }

      return tx.contractTemplate.create({
        data: {
          tenantId,
          version: (current?.version ?? 0) + 1,
          isActive: true,
          fields: {
            create: dto.fields.map((field) => ({
              name: field.name,
              type: field.type,
              required: field.required,
              order: field.order,
            })),
          },
        },
        include: { fields: { orderBy: { order: 'asc' } } },
      });
    });
  }

  async findActive(tenantId: string) {
    return this.prisma.contractTemplate.findFirst({
      where: { tenantId, isActive: true },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.contractTemplate.findMany({
      where: { tenantId },
      orderBy: { version: 'desc' },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  }
}

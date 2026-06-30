import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateService } from '../templates/template.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractFieldsDto } from './dto/update-contract-fields.dto';
import { ContractStatus, FieldType } from '../../../generated/prisma/enums';

type TemplateFieldShape = {
  name: string;
  type: FieldType;
  required: boolean;
};

// Transições permitidas: sempre pra frente, nunca pula etapa nem volta.
const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: [ContractStatus.ACTIVE],
  ACTIVE: [ContractStatus.CLOSED],
  CLOSED: [],
};

@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
  ) {}

  /**
   * Valida os valores enviados contra os campos do template: rejeita campo
   * desconhecido, valida o tipo declarado (TEXT/NUMBER/DATE/BOOLEAN) e,
   * quando `enforceRequired` é true, garante que todo campo obrigatório foi
   * preenchido (usado na criação; na edição parcial não se aplica, já que
   * outros campos já preenchidos permanecem intactos).
   */
  private validateValues(
    values: { fieldName: string; value: string }[],
    templateFields: TemplateFieldShape[],
    options: { enforceRequired: boolean },
  ) {
    const fieldsByName = new Map(templateFields.map((f) => [f.name, f]));

    for (const { fieldName, value } of values) {
      const field = fieldsByName.get(fieldName);
      if (!field) {
        throw new BadRequestException(
          `Campo "${fieldName}" não existe no template ativo`,
        );
      }
      this.validateFieldType(field, value);
    }

    if (options.enforceRequired) {
      const submittedNames = new Set(values.map((v) => v.fieldName));
      const missing = templateFields.filter(
        (f) => f.required && !submittedNames.has(f.name),
      );
      if (missing.length > 0) {
        throw new BadRequestException(
          `Campos obrigatórios ausentes: ${missing.map((f) => f.name).join(', ')}`,
        );
      }
    }
  }

  private validateFieldType(field: TemplateFieldShape, value: string) {
    switch (field.type) {
      case FieldType.NUMBER:
        if (value.trim() === '' || Number.isNaN(Number(value))) {
          throw new BadRequestException(
            `Campo "${field.name}" deve ser numérico`,
          );
        }
        break;
      case FieldType.DATE:
        if (Number.isNaN(Date.parse(value))) {
          throw new BadRequestException(
            `Campo "${field.name}" deve ser uma data válida`,
          );
        }
        break;
      case FieldType.BOOLEAN:
        if (value !== 'true' && value !== 'false') {
          throw new BadRequestException(
            `Campo "${field.name}" deve ser "true" ou "false"`,
          );
        }
        break;
      case FieldType.TEXT:
      default:
        if (value.trim() === '') {
          throw new BadRequestException(
            `Campo "${field.name}" não pode ser vazio`,
          );
        }
    }
  }

  async create(dto: CreateContractDto, tenantId: string, userId: string) {
    const template = await this.templateService.findActive(tenantId);
    if (!template) {
      throw new BadRequestException(
        'O tenant ainda não configurou um template de contrato',
      );
    }

    this.validateValues(dto.values, template.fields, { enforceRequired: true });

    const fieldsByName = new Map(template.fields.map((f) => [f.name, f]));

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          tenantId,
          templateId: template.id,
          status: ContractStatus.DRAFT,
          values: {
            create: dto.values.map((v) => ({
              fieldName: v.fieldName,
              fieldType: fieldsByName.get(v.fieldName)!.type,
              value: v.value,
            })),
          },
        },
        include: { values: true },
      });

      await tx.contractHistory.create({
        data: {
          contractId: contract.id,
          action: 'CREATED',
          changedById: userId,
        },
      });

      return contract;
    });
  }

  async findOne(id: string, tenantId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
      include: {
        values: true,
        template: { include: { fields: true } },
        history: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    return contract;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    newStatus: ContractStatus,
    userId: string,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
    });
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const allowed = ALLOWED_TRANSITIONS[contract.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de status inválida: ${contract.status} → ${newStatus}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: { status: newStatus },
      });

      await tx.contractHistory.create({
        data: {
          contractId: id,
          action: 'STATUS_CHANGED',
          oldValue: contract.status,
          newValue: newStatus,
          changedById: userId,
        },
      });

      return updated;
    });
  }

  async updateFields(
    id: string,
    tenantId: string,
    dto: UpdateContractFieldsDto,
    userId: string,
  ) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
      include: { values: true, template: { include: { fields: true } } },
    });
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        'Só é possível editar campos de um contrato em Rascunho',
      );
    }

    this.validateValues(dto.values, contract.template.fields, {
      enforceRequired: false,
    });

    const fieldsByName = new Map(
      contract.template.fields.map((f) => [f.name, f]),
    );
    const existingByName = new Map(
      contract.values.map((v) => [v.fieldName, v]),
    );

    return this.prisma.$transaction(async (tx) => {
      for (const { fieldName, value } of dto.values) {
        const existing = existingByName.get(fieldName);

        if (existing) {
          if (existing.value === value) continue; // nada mudou, não polui o histórico

          await tx.contractFieldValue.update({
            where: { id: existing.id },
            data: { value },
          });
          await tx.contractHistory.create({
            data: {
              contractId: id,
              action: 'FIELD_UPDATED',
              fieldName,
              oldValue: existing.value,
              newValue: value,
              changedById: userId,
            },
          });
        } else {
          await tx.contractFieldValue.create({
            data: {
              contractId: id,
              fieldName,
              fieldType: fieldsByName.get(fieldName)!.type,
              value,
            },
          });
          await tx.contractHistory.create({
            data: {
              contractId: id,
              action: 'FIELD_UPDATED',
              fieldName,
              oldValue: null,
              newValue: value,
              changedById: userId,
            },
          });
        }
      }

      return tx.contract.findUniqueOrThrow({
        where: { id },
        include: { values: true },
      });
    });
  }
}

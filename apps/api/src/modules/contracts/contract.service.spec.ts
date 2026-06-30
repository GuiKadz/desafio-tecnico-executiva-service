import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractService } from './contract.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateService } from '../templates/template.service';
import { ContractStatus, FieldType } from '../../../generated/prisma/enums';

describe('ContractService', () => {
  let contractService: ContractService;

  const prismaMock = {
    contract: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    contractHistory: { create: jest.fn() },
    contractFieldValue: { update: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(
      (callback: any) => callback(prismaMock) as Promise<any>,
    ),
  };

  const templateServiceMock = {
    findActive: jest.fn(),
  };

  const activeTemplate = {
    id: 'tpl-1',
    fields: [
      { name: 'Nome', type: FieldType.TEXT, required: true },
      { name: 'Valor', type: FieldType.NUMBER, required: true },
      { name: 'Vitalício', type: FieldType.BOOLEAN, required: false },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TemplateService, useValue: templateServiceMock },
      ],
    }).compile();

    contractService = moduleRef.get(ContractService);
  });

  describe('create', () => {
    it('rejeita quando o tenant não tem template ativo', async () => {
      templateServiceMock.findActive.mockResolvedValueOnce(null);

      await expect(
        contractService.create({ values: [] }, 'tenant-A', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita campo obrigatório ausente', async () => {
      templateServiceMock.findActive.mockResolvedValueOnce(activeTemplate);

      await expect(
        contractService.create(
          { values: [{ fieldName: 'Nome', value: 'Acme' }] },
          'tenant-A',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita valor de tipo inválido (NUMBER não numérico)', async () => {
      templateServiceMock.findActive.mockResolvedValueOnce(activeTemplate);

      await expect(
        contractService.create(
          {
            values: [
              { fieldName: 'Nome', value: 'Acme' },
              { fieldName: 'Valor', value: 'não-é-número' },
            ],
          },
          'tenant-A',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita campo que não existe no template ativo', async () => {
      templateServiceMock.findActive.mockResolvedValueOnce(activeTemplate);

      await expect(
        contractService.create(
          {
            values: [
              { fieldName: 'Nome', value: 'Acme' },
              { fieldName: 'Valor', value: '100' },
              { fieldName: 'CampoFantasma', value: 'x' },
            ],
          },
          'tenant-A',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('cria o contrato em DRAFT e registra histórico CREATED', async () => {
      templateServiceMock.findActive.mockResolvedValueOnce(activeTemplate);
      prismaMock.contract.create.mockResolvedValueOnce({
        id: 'contract-1',
        status: ContractStatus.DRAFT,
        values: [],
      });

      const result = await contractService.create(
        {
          values: [
            { fieldName: 'Nome', value: 'Acme' },
            { fieldName: 'Valor', value: '100' },
          ],
        },
        'tenant-A',
        'user-1',
      );

      expect(prismaMock.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-A',
            templateId: 'tpl-1',
            status: ContractStatus.DRAFT,
          }),
        }),
      );
      expect(prismaMock.contractHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contractId: 'contract-1',
          action: 'CREATED',
          changedById: 'user-1',
        }),
      });
      expect(result.id).toBe('contract-1');
    });
  });

  describe('findAll', () => {
    it('aplica paginação e isola por tenant', async () => {
      prismaMock.contract.count.mockResolvedValueOnce(45);
      prismaMock.contract.findMany.mockResolvedValueOnce([{ id: 'c-1' }]);

      const result = await contractService.findAll('tenant-A', {
        page: 2,
        limit: 20,
      });

      expect(prismaMock.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-A' },
          skip: 20,
          take: 20,
        }),
      );
      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });

    it('filtra por status', async () => {
      prismaMock.contract.count.mockResolvedValueOnce(1);
      prismaMock.contract.findMany.mockResolvedValueOnce([]);

      await contractService.findAll('tenant-A', {
        page: 1,
        limit: 20,
        status: ContractStatus.ACTIVE,
      });

      expect(prismaMock.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-A', status: ContractStatus.ACTIVE },
        }),
      );
    });

    it('filtra por intervalo de datas', async () => {
      prismaMock.contract.count.mockResolvedValueOnce(0);
      prismaMock.contract.findMany.mockResolvedValueOnce([]);

      await contractService.findAll('tenant-A', {
        page: 1,
        limit: 20,
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(prismaMock.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-01-31'),
            },
          }),
        }),
      );
    });

    it('busca por valor de campo só quando fieldName e fieldValue vêm juntos', async () => {
      prismaMock.contract.count.mockResolvedValueOnce(0);
      prismaMock.contract.findMany.mockResolvedValueOnce([]);

      // só fieldName, sem fieldValue: não deve aplicar o filtro "values"
      await contractService.findAll('tenant-A', {
        page: 1,
        limit: 20,
        fieldName: 'Nome',
      });

      expect(prismaMock.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-A' } }),
      );

      prismaMock.contract.count.mockResolvedValueOnce(0);
      prismaMock.contract.findMany.mockResolvedValueOnce([]);

      await contractService.findAll('tenant-A', {
        page: 1,
        limit: 20,
        fieldName: 'Nome',
        fieldValue: 'acme',
      });

      expect(prismaMock.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            values: {
              some: {
                fieldName: 'Nome',
                value: { contains: 'acme', mode: 'insensitive' },
              },
            },
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('lança NotFoundException se o contrato não existe (ou não pertence ao tenant)', async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(null);

      await expect(
        contractService.updateStatus(
          'contract-x',
          'tenant-A',
          ContractStatus.ACTIVE,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('permite DRAFT → ACTIVE', async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        status: ContractStatus.DRAFT,
      });
      prismaMock.contract.update.mockResolvedValueOnce({
        id: 'contract-1',
        status: ContractStatus.ACTIVE,
      });

      const result = await contractService.updateStatus(
        'contract-1',
        'tenant-A',
        ContractStatus.ACTIVE,
        'user-1',
      );

      expect(result.status).toBe(ContractStatus.ACTIVE);
      expect(prismaMock.contractHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'STATUS_CHANGED',
          oldValue: ContractStatus.DRAFT,
          newValue: ContractStatus.ACTIVE,
        }),
      });
    });

    it('rejeita pular etapa (DRAFT → CLOSED)', async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        status: ContractStatus.DRAFT,
      });

      await expect(
        contractService.updateStatus(
          'contract-1',
          'tenant-A',
          ContractStatus.CLOSED,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita voltar etapa (ACTIVE → DRAFT)', async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        status: ContractStatus.ACTIVE,
      });

      await expect(
        contractService.updateStatus(
          'contract-1',
          'tenant-A',
          ContractStatus.DRAFT,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateFields', () => {
    const draftContract = {
      id: 'contract-1',
      status: ContractStatus.DRAFT,
      values: [{ id: 'val-1', fieldName: 'Nome', value: 'Acme' }],
      template: { fields: activeTemplate.fields },
    };

    it('rejeita edição de contrato que não está em DRAFT', async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce({
        ...draftContract,
        status: ContractStatus.ACTIVE,
      });

      await expect(
        contractService.updateFields(
          'contract-1',
          'tenant-A',
          { values: [{ fieldName: 'Nome', value: 'Outro' }] },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('atualiza valor existente e registra oldValue/newValue no histórico', async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(draftContract);
      prismaMock.contract.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'contract-1',
        values: [{ fieldName: 'Nome', value: 'Acme LTDA' }],
      });

      await contractService.updateFields(
        'contract-1',
        'tenant-A',
        { values: [{ fieldName: 'Nome', value: 'Acme LTDA' }] },
        'user-1',
      );

      expect(prismaMock.contractFieldValue.update).toHaveBeenCalledWith({
        where: { id: 'val-1' },
        data: { value: 'Acme LTDA' },
      });
      expect(prismaMock.contractHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fieldName: 'Nome',
          oldValue: 'Acme',
          newValue: 'Acme LTDA',
          action: 'FIELD_UPDATED',
        }),
      });
    });

    it('não grava histórico quando o valor enviado é igual ao atual', async () => {
      prismaMock.contract.findFirst.mockResolvedValueOnce(draftContract);
      prismaMock.contract.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'contract-1',
        values: draftContract.values,
      });

      await contractService.updateFields(
        'contract-1',
        'tenant-A',
        { values: [{ fieldName: 'Nome', value: 'Acme' }] },
        'user-1',
      );

      expect(prismaMock.contractFieldValue.update).not.toHaveBeenCalled();
      expect(prismaMock.contractHistory.create).not.toHaveBeenCalled();
    });
  });
});

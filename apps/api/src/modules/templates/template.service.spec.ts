import { Test } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldType } from '../../../generated/prisma/enums';

describe('TemplateService', () => {
  let templateService: TemplateService;

  const prismaMock = {
    contractTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: any) => callback(prismaMock) as Promise<any>,
    ),
  };

  const sampleFields = [
    {
      name: 'Nome do contratante',
      type: FieldType.TEXT,
      required: true,
      order: 0,
    },
    { name: 'Valor', type: FieldType.NUMBER, required: true, order: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    templateService = moduleRef.get(TemplateService);
  });

  describe('createVersion', () => {
    it('cria a versão 1 quando o tenant ainda não tem template ativo', async () => {
      prismaMock.contractTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.contractTemplate.create.mockImplementationOnce(
        ({ data }: any) => Promise.resolve({ id: 'tpl-1', ...data }),
      );

      const result = await templateService.createVersion(
        { fields: sampleFields },
        'tenant-A',
      );

      expect(prismaMock.contractTemplate.update).not.toHaveBeenCalled();
      expect(prismaMock.contractTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-A',
            version: 1,
            isActive: true,
          }),
        }),
      );
      expect(result.version).toBe(1);
    });

    it('desativa a versão anterior (sem alterá-la) e incrementa a versão, mantendo contratos antigos intactos', async () => {
      prismaMock.contractTemplate.findFirst.mockResolvedValueOnce({
        id: 'tpl-old',
        version: 1,
        tenantId: 'tenant-A',
      });
      prismaMock.contractTemplate.create.mockImplementationOnce(
        ({ data }: any) => Promise.resolve({ id: 'tpl-new', ...data }),
      );

      const result = await templateService.createVersion(
        { fields: sampleFields },
        'tenant-A',
      );

      expect(prismaMock.contractTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tpl-old' },
        data: { isActive: false },
      });
      expect(prismaMock.contractTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-A',
            version: 2,
            isActive: true,
          }),
        }),
      );
      expect(result.version).toBe(2);
    });

    it('isola por tenant: nunca usa o template ativo de outro tenant como base da versão', async () => {
      prismaMock.contractTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.contractTemplate.create.mockImplementationOnce(
        ({ data }: any) => Promise.resolve({ id: 'tpl-b1', ...data }),
      );

      await templateService.createVersion({ fields: sampleFields }, 'tenant-B');

      expect(prismaMock.contractTemplate.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-B', isActive: true },
      });
    });
  });

  describe('findActive', () => {
    it('retorna null quando o tenant ainda não configurou nenhum template', async () => {
      prismaMock.contractTemplate.findFirst.mockResolvedValueOnce(null);

      const result = await templateService.findActive('tenant-novo');

      expect(result).toBeNull();
    });
  });
});

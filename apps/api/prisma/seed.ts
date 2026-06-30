import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { ContractStatus, FieldType, Role } from '../generated/prisma/enums';

const SALT_ROUNDS = 10;

const connectionString = process.env.DATABASE_URL ?? '';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function main() {
  const existingTenant = await prisma.tenant.findFirst();
  if (existingTenant) {
    console.log('🌱  Banco já populado — seed ignorado.');
    return;
  }

  console.log('🌱  Iniciando seed…');

  await prisma.contractHistory.deleteMany();
  await prisma.contractFieldValue.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.templateField.deleteMany();
  await prisma.contractTemplate.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const acme = await prisma.tenant.create({
    data: { name: 'Acme Corp', slug: 'acme' },
  });

  const acmeAdmin = await prisma.user.create({
    data: {
      name: 'Admin Acme',
      email: 'admin@acme.com',
      password: await hash('admin@acme.com'),
      role: Role.ADMIN,
      tenantId: acme.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Viewer Acme',
      email: 'viewer@acme.com',
      password: await hash('viewer@acme.com'),
      role: Role.VIEWER,
      tenantId: acme.id,
    },
  });

  const acmeTemplate = await prisma.contractTemplate.create({
    data: {
      tenantId: acme.id,
      version: 1,
      isActive: true,
      fields: {
        create: [
          {
            name: 'Nome do Cliente',
            type: FieldType.TEXT,
            required: true,
            order: 0,
          },
          {
            name: 'Valor (R$)',
            type: FieldType.NUMBER,
            required: true,
            order: 1,
          },
          {
            name: 'Data de Início',
            type: FieldType.DATE,
            required: true,
            order: 2,
          },
          {
            name: 'Renovável',
            type: FieldType.BOOLEAN,
            required: false,
            order: 3,
          },
          {
            name: 'Observações',
            type: FieldType.TEXT,
            required: false,
            order: 4,
          },
        ],
      },
    },
  });

  const acmeContract1 = await prisma.contract.create({
    data: {
      tenantId: acme.id,
      templateId: acmeTemplate.id,
      status: ContractStatus.DRAFT,
      values: {
        create: [
          {
            fieldName: 'Nome do Cliente',
            fieldType: FieldType.TEXT,
            value: 'Empresa Alpha Ltda',
          },
          {
            fieldName: 'Valor (R$)',
            fieldType: FieldType.NUMBER,
            value: '12000',
          },
          {
            fieldName: 'Data de Início',
            fieldType: FieldType.DATE,
            value: '2026-02-01',
          },
          {
            fieldName: 'Renovável',
            fieldType: FieldType.BOOLEAN,
            value: 'true',
          },
        ],
      },
    },
  });
  await prisma.contractHistory.create({
    data: {
      contractId: acmeContract1.id,
      action: 'CREATED',
      changedById: acmeAdmin.id,
    },
  });

  const acmeContract2 = await prisma.contract.create({
    data: {
      tenantId: acme.id,
      templateId: acmeTemplate.id,
      status: ContractStatus.ACTIVE,
      values: {
        create: [
          {
            fieldName: 'Nome do Cliente',
            fieldType: FieldType.TEXT,
            value: 'Beta Sistemas S.A.',
          },
          {
            fieldName: 'Valor (R$)',
            fieldType: FieldType.NUMBER,
            value: '48500',
          },
          {
            fieldName: 'Data de Início',
            fieldType: FieldType.DATE,
            value: '2026-01-10',
          },
          {
            fieldName: 'Renovável',
            fieldType: FieldType.BOOLEAN,
            value: 'false',
          },
          {
            fieldName: 'Observações',
            fieldType: FieldType.TEXT,
            value: 'Pagamento mensal via boleto',
          },
        ],
      },
    },
  });
  await prisma.contractHistory.createMany({
    data: [
      {
        contractId: acmeContract2.id,
        action: 'CREATED',
        changedById: acmeAdmin.id,
      },
      {
        contractId: acmeContract2.id,
        action: 'STATUS_CHANGED',
        oldValue: 'DRAFT',
        newValue: 'ACTIVE',
        changedById: acmeAdmin.id,
      },
    ],
  });

  const acmeContract3 = await prisma.contract.create({
    data: {
      tenantId: acme.id,
      templateId: acmeTemplate.id,
      status: ContractStatus.CLOSED,
      values: {
        create: [
          {
            fieldName: 'Nome do Cliente',
            fieldType: FieldType.TEXT,
            value: 'Gama Tecnologia ME',
          },
          {
            fieldName: 'Valor (R$)',
            fieldType: FieldType.NUMBER,
            value: '7200',
          },
          {
            fieldName: 'Data de Início',
            fieldType: FieldType.DATE,
            value: '2025-06-01',
          },
          {
            fieldName: 'Renovável',
            fieldType: FieldType.BOOLEAN,
            value: 'false',
          },
        ],
      },
    },
  });
  await prisma.contractHistory.createMany({
    data: [
      {
        contractId: acmeContract3.id,
        action: 'CREATED',
        changedById: acmeAdmin.id,
      },
      {
        contractId: acmeContract3.id,
        action: 'FIELD_UPDATED',
        fieldName: 'Valor (R$)',
        oldValue: '6500',
        newValue: '7200',
        changedById: acmeAdmin.id,
      },
      {
        contractId: acmeContract3.id,
        action: 'STATUS_CHANGED',
        oldValue: 'DRAFT',
        newValue: 'ACTIVE',
        changedById: acmeAdmin.id,
      },
      {
        contractId: acmeContract3.id,
        action: 'STATUS_CHANGED',
        oldValue: 'ACTIVE',
        newValue: 'CLOSED',
        changedById: acmeAdmin.id,
      },
    ],
  });

  const globo = await prisma.tenant.create({
    data: { name: 'GloboCorp', slug: 'globocorp' },
  });

  const globoAdmin = await prisma.user.create({
    data: {
      name: 'Admin GloboCorp',
      email: 'admin@globocorp.com',
      password: await hash('admin@globocorp.com'),
      role: Role.ADMIN,
      tenantId: globo.id,
    },
  });

  const globoTemplate = await prisma.contractTemplate.create({
    data: {
      tenantId: globo.id,
      version: 1,
      isActive: true,
      fields: {
        create: [
          {
            name: 'Razão Social',
            type: FieldType.TEXT,
            required: true,
            order: 0,
          },
          { name: 'CNPJ', type: FieldType.TEXT, required: true, order: 1 },
          {
            name: 'Vigência (dias)',
            type: FieldType.NUMBER,
            required: true,
            order: 2,
          },
          {
            name: 'Data de Início',
            type: FieldType.DATE,
            required: true,
            order: 3,
          },
        ],
      },
    },
  });

  const globoContract1 = await prisma.contract.create({
    data: {
      tenantId: globo.id,
      templateId: globoTemplate.id,
      status: ContractStatus.DRAFT,
      values: {
        create: [
          {
            fieldName: 'Razão Social',
            fieldType: FieldType.TEXT,
            value: 'Delta Comércio Eireli',
          },
          {
            fieldName: 'CNPJ',
            fieldType: FieldType.TEXT,
            value: '12.345.678/0001-99',
          },
          {
            fieldName: 'Vigência (dias)',
            fieldType: FieldType.NUMBER,
            value: '365',
          },
          {
            fieldName: 'Data de Início',
            fieldType: FieldType.DATE,
            value: '2026-03-01',
          },
        ],
      },
    },
  });
  await prisma.contractHistory.create({
    data: {
      contractId: globoContract1.id,
      action: 'CREATED',
      changedById: globoAdmin.id,
    },
  });

  const globoContract2 = await prisma.contract.create({
    data: {
      tenantId: globo.id,
      templateId: globoTemplate.id,
      status: ContractStatus.ACTIVE,
      values: {
        create: [
          {
            fieldName: 'Razão Social',
            fieldType: FieldType.TEXT,
            value: 'Epsilon Serviços S.A.',
          },
          {
            fieldName: 'CNPJ',
            fieldType: FieldType.TEXT,
            value: '98.765.432/0001-11',
          },
          {
            fieldName: 'Vigência (dias)',
            fieldType: FieldType.NUMBER,
            value: '180',
          },
          {
            fieldName: 'Data de Início',
            fieldType: FieldType.DATE,
            value: '2026-01-15',
          },
        ],
      },
    },
  });
  await prisma.contractHistory.createMany({
    data: [
      {
        contractId: globoContract2.id,
        action: 'CREATED',
        changedById: globoAdmin.id,
      },
      {
        contractId: globoContract2.id,
        action: 'STATUS_CHANGED',
        oldValue: 'DRAFT',
        newValue: 'ACTIVE',
        changedById: globoAdmin.id,
      },
    ],
  });

  console.log('✅  Seed concluído:');
  console.log('    Tenant "acme"      → admin@acme.com / admin@acme.com');
  console.log('    Tenant "acme"      → viewer@acme.com / viewer@acme.com');
  console.log(
    '    Tenant "globocorp" → admin@globocorp.com / admin@globocorp.com',
  );
  console.log('    3 contratos Acme (DRAFT, ACTIVE, CLOSED)');
  console.log('    2 contratos GloboCorp (DRAFT, ACTIVE)');
}

main()
  .catch((e) => {
    console.error('❌  Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

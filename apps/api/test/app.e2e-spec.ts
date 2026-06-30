import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

describe('Fluxo completo (e2e)', () => {
  let app: INestApplication;
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  let adminToken: string;
  let viewerToken: string;
  let templateId: string;
  let contractId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new PrismaExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria o tenant + admin no onboarding e já retorna tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/onboarding')
      .send({
        tenantName: 'Empresa E2E',
        tenantSlug: slug,
        adminName: 'Admin E2E',
        adminEmail: `admin-${slug}@e2e.test`,
        adminPassword: 'SenhaForte123!',
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    adminToken = response.body.accessToken;
  });

  it('faz login com as credenciais recém-criadas', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `admin-${slug}@e2e.test`, password: 'SenhaForte123!' })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    adminToken = response.body.accessToken;
  });

  it('rejeita login com senha errada', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `admin-${slug}@e2e.test`, password: 'senha-errada' })
      .expect(401);
  });

  it('bloqueia acesso sem token', async () => {
    await request(app.getHttpServer()).get('/contracts').expect(401);
  });

  it('retorna dados do tenant autenticado via GET /tenants/me', async () => {
    const response = await request(app.getHttpServer())
      .get('/tenants/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.slug).toBe(slug);
    expect(response.body._count).toBeDefined();
  });

  it('Admin cria um usuário Viewer no mesmo tenant', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Viewer E2E',
        email: `viewer-${slug}@e2e.test`,
        password: 'SenhaForte123!',
        role: 'VIEWER',
      })
      .expect(201);

    expect(response.body.role).toBe('VIEWER');
  });

  it('Viewer faz login e obtém token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `viewer-${slug}@e2e.test`, password: 'SenhaForte123!' })
      .expect(200);

    viewerToken = response.body.accessToken;
  });

  it('Viewer NÃO pode criar template (403)', async () => {
    await request(app.getHttpServer())
      .post('/templates')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ fields: [{ name: 'X', type: 'TEXT', required: true, order: 0 }] })
      .expect(403);
  });

  it('Admin cria a primeira versão do template de contrato', async () => {
    const response = await request(app.getHttpServer())
      .post('/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [
          {
            name: 'Nome do contratante',
            type: 'TEXT',
            required: true,
            order: 0,
          },
          { name: 'Valor', type: 'NUMBER', required: true, order: 1 },
        ],
      })
      .expect(201);

    expect(response.body.version).toBe(1);
    templateId = response.body.id;
  });

  it('Viewer NÃO pode criar contrato (403)', async () => {
    await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        values: [
          { fieldName: 'Nome do contratante', value: 'Acme LTDA' },
          { fieldName: 'Valor', value: '1500' },
        ],
      })
      .expect(403);
  });

  it('rejeita criação de contrato com campo obrigatório ausente', async () => {
    await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ values: [{ fieldName: 'Nome do contratante', value: 'Acme' }] })
      .expect(400);
  });

  it('Admin cria um contrato válido em Rascunho', async () => {
    const response = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        values: [
          { fieldName: 'Nome do contratante', value: 'Acme LTDA' },
          { fieldName: 'Valor', value: '1500' },
        ],
      })
      .expect(201);

    expect(response.body.status).toBe('DRAFT');
    expect(response.body.templateId).toBe(templateId);
    contractId = response.body.id;
  });

  it('Viewer consegue listar contratos (leitura permitida)', async () => {
    const response = await request(app.getHttpServer())
      .get('/contracts')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
  });

  it('Viewer NÃO pode mover status do contrato (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/contracts/${contractId}/status`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'ACTIVE' })
      .expect(403);
  });

  it('Admin avança o contrato de Rascunho para Ativo', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/contracts/${contractId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    expect(response.body.status).toBe('ACTIVE');
  });

  it('rejeita pular etapa (Ativo → Rascunho)', async () => {
    await request(app.getHttpServer())
      .patch(`/contracts/${contractId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DRAFT' })
      .expect(400);
  });

  it('retorna o contrato com histórico (CREATED + STATUS_CHANGED)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const actions = response.body.history.map(
      (h: { action: string }) => h.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining(['CREATED', 'STATUS_CHANGED']),
    );
  });

  it('retorna histórico paginado via GET /contracts/:id/history', async () => {
    const response = await request(app.getHttpServer())
      .get(`/contracts/${contractId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('filtra histórico por ação', async () => {
    const response = await request(app.getHttpServer())
      .get(`/contracts/${contractId}/history`)
      .query({ action: 'STATUS_CHANGED' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    response.body.data.forEach((h: { action: string }) => {
      expect(h.action).toBe('STATUS_CHANGED');
    });
  });

  it('lista contratos filtrando por status e encontra o que acabou de ser criado', async () => {
    const response = await request(app.getHttpServer())
      .get('/contracts')
      .query({ status: 'ACTIVE', page: 1, limit: 20 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ids = response.body.data.map((c: { id: string }) => c.id);
    expect(ids).toContain(contractId);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
  });
});

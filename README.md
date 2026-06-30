# 📝 Executiva Service — Plataforma SaaS de Gestão de Contratos

[![NestJS](https://img.shields.io/badge/backend-NestJS-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/frontend-Next.js-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/infra-Docker-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

---

## 🚀 Visão Geral da Solução

### Diferenciais Técnicos
- **Isolamento Nativo**: Arquitetura multi-tenant que garante que uma empresa nunca acesse dados de outra.
- **Segurança Bancária**: Autenticação JWT com rotação de Refresh Tokens em cookies `httpOnly`.
- **Auditoria Completa**: Histórico imutável de cada campo alterado, status modificado e autor da ação.
- **Setup Instantâneo**: Orquestração completa via Docker Compose para ambiente de desenvolvimento e produção.

---

## 🛠️ Stack Tecnológica

### Backend (Core API)
- **Framework**: [NestJS](https://nestjs.com/) (Arquitetura modular e escalável)
- **ORM**: [Prisma](https://www.prisma.io/) (Tipagem forte e migrações seguras)
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) (Confiabilidade e performance)
- **Segurança**: JWT (Access + Refresh Tokens), Bcrypt, RBAC (Role-Based Access Control)
- **Qualidade**: Jest (Testes Unitários e E2E), Class-validator (Validação rigorosa de dados)

### Frontend (Interface)
- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server Components)
- **Linguagem**: TypeScript (Segurança em tempo de desenvolvimento)
- **Estilização**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)
- **Design**: Estética Neo-Brutalista focada em clareza e eficiência.

---

## ⚙️ Como Executar (Quick Start)

A solução foi projetada para subir com **um único comando**, configurando automaticamente o banco de dados, aplicando migrações e populando dados iniciais.

**Pré-requisitos**: Docker e Docker Compose.

```bash
# 1. Clone o repositório e acesse a pasta
git clone https://github.com/GuiKadz/desafio-tecnico-executiva-service
cd desafio-tecnico-executiva-service

# 2. Configure as variáveis de ambiente (padrão otimizado incluso)
cp .env.example .env

# 3. Inicie a plataforma completa
docker compose up --build
```

### Endpoints Disponíveis
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API REST**: [http://localhost:3001](http://localhost:3001)
- **Documentação (Swagger)**: [http://localhost:3001/docs](http://localhost:3001/docs)

---

## 🔒 Segurança e Arquitetura

### 1. Multi-tenancy & Isolamento
Diferente de abordagens frágeis, o `tenantId` **nunca** é aceito via parâmetros de requisição (body/query). Ele é extraído de forma segura do JWT do usuário no servidor. Isso impede ataques de IDOR (Insecure Direct Object Reference).

### 2. Ciclo de Vida de Tokens
Implementei um fluxo de autenticação de alta segurança:
- **Access Token**: Curta duração (15 min), armazenado em memória/state.
- **Refresh Token**: Longa duração, armazenado em **Cookie httpOnly + SameSite=Lax**. Proteção total contra ataques XSS.
- **Rotação & Reuso**: Se um atacante tentar reutilizar um Refresh Token antigo, o sistema detecta a anomalia e **revoga imediatamente todas as sessões** do usuário.

### 3. Versionamento de Templates
Alterar um modelo de contrato não quebra contratos antigos. O sistema utiliza um sistema de **versionamento de snapshots**:
- Contratos existentes permanecem vinculados à versão do template com a qual foram criados.
- Novos contratos utilizam automaticamente a versão ativa mais recente.

---

## 📊 Dados de Demonstração (Seed)

O sistema já inicia com dados para teste. As senhas padrão são iguais aos e-mails.

| Tenant | Usuário | Papel |
| :--- | :--- | :--- |
| **Acme Corp** | `admin@acme.com` | Administrador |
| **Acme Corp** | `viewer@acme.com` | Visualizador |
| **GloboCorp** | `admin@globocorp.com` | Administrador |

---

## 🏗️ Estrutura do Monorepo

```text
.
├── apps/
│   ├── api/          # Backend NestJS (Módulos: Auth, Tenants, Contracts, History)
│   └── web/          # Frontend Next.js (App Router + Tailwind)
├── prisma/           # Schema centralizado e scripts de Seed
├── docker-compose.yml # Orquestração de infraestrutura
└── README.md         # Documentação da proposta
```

---

## 🧪 Testes e Qualidade

Para garantir a confiabilidade da lógica de negócio, o projeto conta com suítes de testes automatizados:

```bash
# Executar testes unitários (API)
pnpm --filter api test

# Executar testes de integração/E2E
pnpm --filter api test:e2e
```

---

## 📈 Decisões de Engenharia

- **Next.js vs Vite**: Optei pelo Next.js nativo para aproveitar o **App Router** e **Server-side Rendering**, garantindo uma performance superior e SEO-friendly, em vez de uma SPA simples com Vite.
- **Rastreabilidade**: Implementei um `RequestIdMiddleware`. Cada log gerado possui um ID único por requisição, permitindo rastrear um erro desde a interface até o banco de dados.
- **Neo-Brutalismo**: A escolha estética visa reduzir o ruído visual, focando no que importa para o usuário corporativo: **dados e ações**.

---

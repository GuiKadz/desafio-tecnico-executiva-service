# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps ----
FROM base AS deps
# Adicionado para garantir que o pnpm funcione corretamente em ambientes Docker
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build ----
FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Variável necessária para o build do Next.js saber que deve otimizar para produção
ENV NODE_ENV=production

COPY apps/web apps/web
WORKDIR /repo/apps/web
# IMPORTANTE: Garanta que seu next.config.js tenha: output: 'standalone'
RUN pnpm build

# ---- runtime: Next standalone server ----
FROM base AS runtime
ENV NODE_ENV=production
# HOSTNAME=0.0.0.0 é essencial para o Docker expor a porta corretamente
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

WORKDIR /repo

# O Next standalone gera um servidor completo em .next/standalone
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static     ./apps/web/.next/static

# O entrypoint no modo standalone fica dentro da pasta da aplicação
WORKDIR /repo/apps/web
EXPOSE 3000

CMD ["node", "server.js"]

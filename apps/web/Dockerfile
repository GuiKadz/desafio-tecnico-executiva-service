# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build ----
FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY apps/web apps/web
WORKDIR /repo/apps/web
RUN pnpm build

# ---- runtime: Next standalone server ----
#
# Em monorepos pnpm com output:"standalone", o Next traça dependências a partir
# do workspace root (onde pnpm-lock.yaml vive). Por isso o .next/standalone
# espelha a estrutura completa do repo:
#   .next/standalone/
#     apps/web/server.js   ← entry point correto
#     apps/web/.next/
#     node_modules/
#
# O COPY abaixo preserva essa árvore. O WORKDIR e CMD apontam para o caminho
# correto dentro dela.
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static     ./apps/web/.next/static
COPY --from=build /repo/apps/web/public           ./apps/web/public

# server.js está em /repo/apps/web/server.js (não em /repo/server.js)
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["node", "server.js"]

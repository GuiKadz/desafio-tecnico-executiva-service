# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps: install workspace deps without running postinstall (prisma generate needs the schema, not copied yet) ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build: generate prisma client + compile nest ----
FROM deps AS build
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN pnpm prisma:generate
RUN pnpm build

# ---- runtime: only what's needed to run the compiled app ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo

RUN apk add --no-cache openssl

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/generated ./apps/api/generated
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

WORKDIR /repo/apps/api
EXPOSE 3001

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]

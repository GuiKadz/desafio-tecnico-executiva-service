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

# ---- runtime: Next standalone server, no node_modules needed ----
# NOTE: in a pnpm/turborepo monorepo, Next traces from the workspace root
# (where pnpm-lock.yaml lives), so .next/standalone mirrors that structure:
# server.js lands at standalone/apps/web/server.js, not at standalone/server.js.
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["node", "server.js"]

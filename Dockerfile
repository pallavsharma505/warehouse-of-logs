# ---- Install dependencies ----
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
COPY packages/db/package.json packages/db/package.json
COPY apps/collector/package.json apps/collector/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN bun install --frozen-lockfile

# ---- Build frontend ----
FROM deps AS frontend-build
COPY packages/ packages/
COPY apps/frontend/ apps/frontend/
RUN cd apps/frontend && bun run build

# ---- Production image ----
FROM oven/bun:1-slim
RUN apt-get update && apt-get install -y --no-install-recommends nginx && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY packages/ packages/
COPY apps/collector/ apps/collector/
COPY apps/api/ apps/api/

# Copy built frontend + nginx config
COPY --from=frontend-build /app/apps/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Copy entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 7001 7002 7003

CMD ["/app/entrypoint.sh"]

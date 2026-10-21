# Deployed image. Keeps dev dependencies: the Prisma CLI runs `migrate deploy` and the seed from it.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build && npx tsc -p tsconfig.scripts.json

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=development
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS http://localhost:3000/health || exit 1
CMD ["node", "dist/main"]

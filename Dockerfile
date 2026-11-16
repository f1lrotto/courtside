# Production image for Railway (or any Docker host). The scraper shells out to curl,
# which slim Node images don't include. The SQLite file lives on a volume at /data.
FROM node:26-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.0.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && rm -rf node_modules && pnpm install --prod --frozen-lockfile --ignore-scripts

FROM node:26-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
ENV NODE_ENV=production DATABASE_PATH=/data/padel.db
CMD ["node", "build"]

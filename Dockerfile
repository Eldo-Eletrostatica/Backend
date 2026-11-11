# The last stage is "prod" because Render builds the last stage of the
# Dockerfile and accepts no --target. docker-compose.yml picks "dev" by name
# (hot reload with the source mounted as a volume).

FROM node:22-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# Compiles the TypeScript with every dependency, dev ones included.
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Only what the API needs to run: no compiler, test tools or sources.
FROM base AS prod-deps
RUN npm ci --omit=dev

FROM node:22-alpine AS prod
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
# The API applies the pending migrations on boot (migrationsRun), so the
# image needs no separate migration step. Not root.
USER node
EXPOSE 3000
CMD ["node", "dist/main"]

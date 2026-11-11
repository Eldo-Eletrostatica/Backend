# Without --target the build ends at the last stage, "dev", which is what
# docker-compose.yml uses (hot reload with the source mounted as a volume).

FROM node:22-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# Compiles the TypeScript with every dependency, dev ones included.
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Only what the API needs to run: no compiler, test tools or sources.
FROM base AS prod-deps
RUN npm ci --omit=dev

FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

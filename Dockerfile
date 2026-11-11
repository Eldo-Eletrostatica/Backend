# Without --target the build ends at the last stage, "dev", which is what
# docker-compose.yml uses (hot reload with the source mounted as a volume).

FROM node:22-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

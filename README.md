# Backend

Backend do site whitelabel da Eldo Eletrostática (empresa de pintura eletrostática).

## Stack

- [NestJS](https://nestjs.com/) (Node + TypeScript), estruturado em MVC (Controller → Service → Model)
- [TypeORM](https://typeorm.io/) + PostgreSQL
- Docker / Docker Compose

## Requisitos

- Docker e Docker Compose

Rodar via Docker é a forma padrão de desenvolvimento deste projeto — já sobe o Postgres junto, sem precisar instalar nada localmente.

Node.js 22+ e npm só são necessários se você optar por rodar localmente sem Docker (ver seção abaixo), e nesse caso você também precisa de um PostgreSQL rodando à parte.

## Configuração

Copie o arquivo de variáveis de ambiente:

```bash
cp .env.example .env
```

Variáveis disponíveis (`.env.example`):

| Variável | Descrição |
| --- | --- |
| `DB_HOST` | Host do PostgreSQL (`postgres` ao rodar via Docker Compose; `localhost` ao rodar local) |
| `DB_PORT` | Porta do PostgreSQL (padrão `5432`) |
| `DB_USERNAME` | Usuário do PostgreSQL |
| `DB_PASSWORD` | Senha do PostgreSQL |
| `DB_NAME` | Nome do banco |
| `PORT` | Porta em que a API sobe (padrão `3000`) |

> No `docker-compose.yml`, essas variáveis já vêm sobrescritas com os valores corretos para o container (`DB_HOST=postgres`), então o `.env` local só é realmente necessário se você rodar sem Docker.

## Rodando com Docker (padrão)

```bash
docker compose up --build
```

Isso sobe dois serviços:
- `postgres` — PostgreSQL 16, na porta `5432`
- `backend` — a API NestJS, com hot-reload via volume montado, na porta `3001` (mapeada para a `3000` interna do container)

Acesse:
- API: [http://localhost:3001](http://localhost:3001) (retorna `Hello World!`)
- Documentação Swagger: [http://localhost:3001/api](http://localhost:3001/api)

### Se a stack ficar "presa" (containers travados, erro de rede/DNS entre backend e postgres)

Recrie do zero:

```bash
docker compose down
docker compose up -d --build
```

## Rodando localmente sem Docker (alternativa)

Requer um PostgreSQL rodando à parte, com `.env` apontando `DB_HOST=localhost` para ele.

```bash
npm install
npm run start:dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Verificando que está tudo funcionando

```bash
# containers de pé
docker compose ps

# API respondendo
curl http://localhost:3001

# conexão com o banco realmente estabelecida (não só o container subiu)
docker compose logs backend | grep -i TypeOrmCoreModule

# banco acessível diretamente
docker compose exec postgres psql -U postgres -c '\l'
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run start:dev` | Inicia o servidor de desenvolvimento com hot-reload |
| `npm run build` | Gera o build de produção |
| `npm run start:prod` | Inicia o build de produção (`dist/main.js`) |
| `npm run lint` | Executa o linter |
| `npm run test` | Executa os testes unitários |
| `npm run test:e2e` | Executa os testes end-to-end |

# Backend

Backend do site institucional da Eldo Eletrostática (empresa de pintura eletrostática).

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
- `postgres`: PostgreSQL 16, na porta `5432`
- `backend`: a API NestJS, com hot-reload via volume montado, na porta `3001` (mapeada para a `3000` interna do container). Ao subir, ela aplica as migrations pendentes, então o banco já fica com todas as tabelas.

Acesse:
- API: [http://localhost:3001](http://localhost:3001) (retorna `Hello World!`)
- Documentação Swagger: [http://localhost:3001/api](http://localhost:3001/api)

### Depois de mudar dependências (`package.json`)

O `node_modules` do container fica num volume próprio, que o `--build` sozinho não atualiza. Recrie o volume junto:

```bash
docker compose up -d --build -V
```

### Se a stack ficar "presa" (containers travados, erro de rede/DNS entre backend e postgres)

Recrie do zero:

```bash
docker compose down
docker compose up -d --build
```

## Banco de dados

O schema é versionado em migrations do TypeORM, em `src/database/migrations/`. O `synchronize` fica desligado: o banco só muda por migration.

- As entities ficam em `src/<feature>/entities/` e seguem as convenções de nomes do `AGENTS.md` (PK `<entidade>_id`, FK com o nome da PK referenciada).
- A configuração do banco fica em `src/database/typeorm.config.ts` e é a mesma para a API e para a CLI de migrations.
- A API aplica as migrations pendentes sozinha ao subir. Não é preciso rodar nada para criar as tabelas.

### Comandos de migration

Rode dentro do container, com a stack de pé:

```bash
# aplica as migrations pendentes
docker compose exec backend npm run migration:run

# desfaz a última migration aplicada
docker compose exec backend npm run migration:revert

# gera uma migration com a diferença entre as entities e o banco
docker compose exec backend npm run migration:generate -- src/database/migrations/<NomeDaMudanca>
```

Para mudar o schema: altere a entity, gere a migration, confira o SQL gerado e suba a app (ou rode `migration:run`). O arquivo gerado no container pertence ao `root`; se o editor não conseguir salvar, devolva a posse com `sudo chown -R $USER src/database/migrations`.

### Apagando o banco e recriando do zero

```bash
docker compose down -v
docker compose up -d --build
```

O `-v` apaga o volume do Postgres. Na subida seguinte, as migrations recriam todas as tabelas.

### Visualizando o banco no pgAdmin

O pgAdmin não faz parte da stack: use o que está instalado na sua máquina. Com o `docker compose` de pé, o Postgres fica exposto em `localhost:5432`.

1. No pgAdmin, clique com o botão direito em *Servers* › *Register › Server*.
2. Na aba *General*, dê um nome (por exemplo, `Eldo (Docker)`).
3. Na aba *Connection*, preencha host `localhost`, porta `5432`, banco `postgres`, usuário `postgres` e senha `postgres`.
4. As tabelas ficam em *Databases › postgres › Schemas › public › Tables*.
5. Para gerar o diagrama físico (ERD), clique com o botão direito em *Databases › postgres* e escolha **ERD For Database**. O diagrama pode ser exportado como imagem pelo botão de download.

## Rodando localmente sem Docker (alternativa)

Requer um PostgreSQL rodando à parte, com `.env` apontando `DB_HOST=localhost` para ele.

```bash
npm install
npm run start:dev
```

Acesse [http://localhost:3000](http://localhost:3000).

A CLI de migrations não lê o `.env`: sem Docker, ela usa os valores padrão (`localhost:5432`, usuário e senha `postgres`) ou as variáveis `DB_*` exportadas no terminal.

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

# tabelas criadas pelas migrations
docker compose exec postgres psql -U postgres -c '\dt'
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run start:dev` | Inicia o servidor de desenvolvimento com hot-reload |
| `npm run build` | Gera o build de produção |
| `npm run start:prod` | Inicia o build de produção (`dist/main.js`) |
| `npm run lint` | Executa o linter |
| `npm run test` | Executa os testes unitários |
| `npm run test:e2e` | Executa os testes end-to-end (precisam do Postgres no ar; rode com `docker compose exec backend npm run test:e2e`) |
| `npm run migration:run` | Aplica as migrations pendentes |
| `npm run migration:revert` | Desfaz a última migration aplicada |
| `npm run migration:generate -- <caminho>` | Gera uma migration a partir das mudanças nas entities |

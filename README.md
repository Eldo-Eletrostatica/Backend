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
| `S3_ENDPOINT` | Endpoint da API S3 (`http://seaweedfs:8333` no Docker Compose; em produção, `https://<account_id>.r2.cloudflarestorage.com`) |
| `S3_REGION` | Região do S3 (`auto`, que é o valor do R2) |
| `S3_BUCKET` | Bucket onde ficam imagens e PDFs |
| `S3_ACCESS_KEY_ID` | Chave de acesso ao bucket |
| `S3_SECRET_ACCESS_KEY` | Segredo da chave de acesso |
| `S3_PUBLIC_URL` | URL pública do bucket, usada para montar o link salvo no banco |
| `GOOGLE_PLACES_API_KEY` | Chave da Places API do Google Cloud, usada pela rota `/reviews` |
| `GOOGLE_PLACE_ID` | Place ID da Eldo no Google, a empresa cujas avaliações aparecem no site |
| `USE_SAMPLE_REVIEWS` | Com `true`, a rota `/reviews` devolve avaliações de exemplo no lugar das do Google. O `docker-compose.yml` liga por padrão, para o desenvolvimento rodar sem chave. Em produção, deixe `false` |

> No `docker-compose.yml`, essas variáveis já vêm sobrescritas com os valores corretos para o container (`DB_HOST=postgres`, `S3_ENDPOINT=http://seaweedfs:8333`), então o `.env` local só é realmente necessário se você rodar sem Docker.

## Rodando com Docker (padrão)

```bash
docker compose up --build
```

Isso sobe três serviços:
- `postgres`: PostgreSQL 16, na porta `5432`
- `seaweedfs`: armazenamento de arquivos compatível com S3, na porta `8333` (ver [Armazenamento de arquivos](#armazenamento-de-arquivos)). Um container auxiliar, `seaweedfs-setup`, cria o bucket `eldo` e encerra.
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

O `-v` apaga os volumes do Postgres e do SeaweedFS. Na subida seguinte, as migrations recriam todas as tabelas e o `seaweedfs-setup` recria o bucket vazio.

### Visualizando o banco no pgAdmin

O pgAdmin não faz parte da stack: use o que está instalado na sua máquina. Com o `docker compose` de pé, o Postgres fica exposto em `localhost:5432`.

1. No pgAdmin, clique com o botão direito em *Servers* › *Register › Server*.
2. Na aba *General*, dê um nome (por exemplo, `Eldo (Docker)`).
3. Na aba *Connection*, preencha host `localhost`, porta `5432`, banco `postgres`, usuário `postgres` e senha `postgres`.
4. As tabelas ficam em *Databases › postgres › Schemas › public › Tables*.
5. Para gerar o diagrama físico (ERD), clique com o botão direito em *Databases › postgres* e escolha **ERD For Database**. O diagrama pode ser exportado como imagem pelo botão de download.

## Armazenamento de arquivos

Imagens e PDFs ficam num armazenamento compatível com S3, e o banco guarda só a URL (ADR 0006 da Documentacao). O código usa a mesma API S3 nos dois ambientes; muda só o valor das variáveis `S3_*`:

| Ambiente | Serviço | Conta |
| --- | --- | --- |
| Desenvolvimento e testes | SeaweedFS no `docker compose` | nenhuma |
| Produção | Cloudflare R2 | do cliente |

No desenvolvimento, a chave `eldo-dev` (definida em `docker/seaweedfs/s3.json`) pode enviar e apagar arquivos, e a leitura é pública, como num bucket R2 com acesso público: um arquivo enviado como `portfolio/capa.jpg` abre em `http://localhost:8333/eldo/portfolio/capa.jpg`. Listar o bucket e enviar arquivos sem chave dão 403.

Os arquivos ficam no volume `seaweedfs_data`, e o `docker compose down -v` apaga junto com o banco. O `seaweedfs-setup` também cria o bucket `eldo-test`, que os testes de integração usam no lugar do `eldo` (`test/setup-env.ts`). Assim os testes podem apagar o que enviam sem mexer nas imagens de desenvolvimento.

No código, só o módulo `storage` (`src/storage/`) fala com o bucket. Uma feature com upload importa o `StorageModule`, injeta o `StorageService` e chama `upload(arquivo, pasta)`, que guarda o arquivo com nome aleatório e devolve `{ key, url }`. A URL é o que vai para o banco. O formato e o tamanho aceitos são validados pela própria feature, antes do upload. Exemplo: a configuração visual do site (`src/site-settings/`) aceita PNG, JPEG e WebP até 5 MB na pasta `visual/` e, ao publicar, apaga as imagens dessa pasta que não estão em uso e foram enviadas há mais de 1 hora.

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

## Integração contínua

Todo PR para a `main` e todo push nela rodam o workflow `.github/workflows/ci.yml` no GitHub Actions: `npm ci`, `lint:check`, `build`, testes unitários e testes de integração contra um Postgres de serviço.

A `main` é protegida: só recebe mudanças por PR, e o PR só pode ser mergeado com o check **Lint, build e testes** verde e a branch atualizada com a `main`. A regra vale também para administradores.

Os testes de integração rodam também contra o SeaweedFS, que o CI sobe pelo `docker-compose.yml`.

Para não descobrir o erro só no CI, rode antes de abrir o PR:

```bash
docker compose exec backend npm run lint:check
docker compose exec backend npm run test
docker compose exec backend npm run test:e2e
```

Como o CI usa `npm ci`, um `package.json` alterado sem o `package-lock.json` correspondente quebra o build: commite os dois juntos.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run start:dev` | Inicia o servidor de desenvolvimento com hot-reload |
| `npm run build` | Gera o build de produção |
| `npm run start:prod` | Inicia o build de produção (`dist/main.js`) |
| `npm run lint` | Executa o linter e corrige o que for automático |
| `npm run lint:check` | Executa o linter sem alterar arquivos (usado no CI) |
| `npm run test` | Executa os testes unitários |
| `npm run test:e2e` | Executa os testes end-to-end (precisam do Postgres no ar; rode com `docker compose exec backend npm run test:e2e`) |
| `npm run migration:run` | Aplica as migrations pendentes |
| `npm run migration:revert` | Desfaz a última migration aplicada |
| `npm run migration:generate -- <caminho>` | Gera uma migration a partir das mudanças nas entities |

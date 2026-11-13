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
| `DB_SSL` | Com `true`, conecta com SSL. Exigido pelo Neon, que hospeda o banco da homologação; desligado no desenvolvimento e na produção, que fica na rede privada do Render |
| `PORT` | Porta em que a API sobe (padrão `3000`) |
| `S3_ENDPOINT` | Endpoint da API S3 (`http://seaweedfs:8333` no Docker Compose; em produção, `https://<account_id>.r2.cloudflarestorage.com`) |
| `S3_REGION` | Região do S3 (`auto`, que é o valor do R2) |
| `S3_BUCKET` | Bucket onde ficam imagens e PDFs |
| `S3_ACCESS_KEY_ID` | Chave de acesso ao bucket |
| `S3_SECRET_ACCESS_KEY` | Segredo da chave de acesso |
| `S3_PUBLIC_URL` | URL pública do bucket, usada para montar o link salvo no banco |
| `GOOGLE_PLACES_API_KEY` | Chave da Places API do Google Cloud, usada pela rota `/reviews`. **Ainda não existe** (ver [Avaliações do Google](#avaliações-do-google)) |
| `GOOGLE_PLACE_ID` | Place ID da Eldo no Google, a empresa cujas avaliações aparecem no site |
| `USE_SAMPLE_REVIEWS` | Com `true`, a rota `/reviews` devolve avaliações de exemplo no lugar das do Google. O `docker-compose.yml` liga por padrão, para o desenvolvimento rodar sem chave. Em produção, deixe `false` |
| `JWT_SECRET` | Segredo HMAC-SHA256 usado para assinar e validar tokens JWT de autenticação dos funcionários. Em produção, precisa ter pelo menos 32 caracteres e não pode ser o do `.env.example`: gere com `openssl rand -hex 32` |
| `INITIAL_ADMIN_NAME` | Nome do administrador inicial provisionado no primeiro login quando ainda não há administradores |
| `INITIAL_ADMIN_EMAIL` | E-mail do administrador inicial provisionado no primeiro login |
| `INITIAL_ADMIN_PASSWORD` | Senha do administrador inicial provisionado no primeiro login |
| `CORS_ORIGINS` | Origens liberadas no CORS, separadas por vírgula (padrão `http://localhost:3000`). O site usa o proxy do Frontend e não depende do CORS (ver [Autenticação](#autenticação)) |
| `NODE_ENV` | Com `production`, os cookies de sessão saem com `Secure` (o site precisa de HTTPS), o Swagger sai do ar e a API confere a configuração ao subir (ver [Imagem de produção](#imagem-de-produção)) |
| `ENABLE_SWAGGER` | Com `true`, mantém o Swagger em `/api` mesmo em produção. Fora de produção, ele já fica no ar |
| `SMTP_HOST`, `SMTP_PORT` | Servidor de e-mail (SMTP). No Docker Compose, o Mailpit (`mailpit:1025`); em produção, o SMTP do e-mail do cliente. Sem `SMTP_HOST`, nenhum e-mail é enviado |
| `SMTP_USER`, `SMTP_PASSWORD` | Usuário e senha do SMTP. Vazios no Mailpit |
| `SMTP_FROM` | Remetente dos e-mails, como `Site Eldo <site@dominio.com.br>` |
| `NOTIFICATION_EMAIL` | Quem recebe os avisos de contato e de orçamento novos pelo site (US28). Vazio, nenhum aviso é enviado e os pedidos ficam só na área interna |
| `TURNSTILE_SECRET_KEY` | Chave secreta do CAPTCHA (Cloudflare Turnstile) dos formulários públicos. O compose usa a chave de teste da Cloudflare, que aceita qualquer token. Sem ela, os formulários recusam todo envio (ver [Proteção contra spam](#proteção-contra-spam)) |
| `E2E_CAPTCHA_TOKEN` | Segredo que a suíte Selenium do Frontend manda no lugar do token do CAPTCHA, porque a Cloudflare não deixa navegador automatizado passar no desafio de produção. Vazio, não existe liberação. Em produção, um valor aleatório de pelo menos 32 caracteres, que só quem roda a suíte conhece (ver [Proteção contra spam](#proteção-contra-spam)) |

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
- Documentação Swagger: [http://localhost:3001/api](http://localhost:3001/api) (só fora de produção; ver `ENABLE_SWAGGER`)

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

## Avaliações do Google

> [!WARNING]
> **Pendente: falta a chave da Places API.** O código da rota `/reviews` está pronto, mas nunca foi testado contra o Google de verdade, porque ainda não existe a conta do Google Cloud com a chave. Até lá, o desenvolvimento usa as avaliações de exemplo (`USE_SAMPLE_REVIEWS=true`), e um servidor sem a chave responde `isAvailable: false`, com um aviso no log ao subir. Os passos abaixo são o que falta para publicar o site.

A rota `GET /reviews` (US05) busca as avaliações da Eldo na Places API (New) a cada requisição, porque as políticas do Google proíbem guardar esse conteúdo. Para segurar o custo, ela faz no máximo 30 chamadas por dia, o que cabe nas 1.000 grátis do mês.

Para ligar o Google de verdade:

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e cadastre a conta de cobrança.
2. Em **APIs e serviços › Biblioteca**, ative a **Places API (New)**.
3. Em **APIs e serviços › Credenciais**, crie uma chave de API e restrinja ela à Places API (New).
4. Em **APIs e serviços › Cotas**, defina uma cota diária para a Places API, como segunda proteção de custo.
5. O Place ID da Eldo (`ChIJc3r5Q0UtWpMRcWGTgj811LI`) já está no `.env.example`. Ele foi derivado do link do Google Maps da empresa, então confirme com o passo 7; se estiver errado, o script mostra o ID que o Google conhece.
6. No servidor, configure `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` e `USE_SAMPLE_REVIEWS=false`.
7. Teste o acesso com `npm run google:check` (lê o `.env`). Ele chama a Places API como a rota faz e mostra as avaliações que o site vai exibir, ou o motivo da recusa (cobrança desligada, API não ativada, chave restrita, Place ID errado).

A Places API devolve no máximo 5 avaliações por consulta, as mais relevantes segundo o Google.

## Avisos por e-mail

Cada pedido novo pelo site gera um aviso para `NOTIFICATION_EMAIL` (US28):

| Pedido | Assunto | Conteúdo |
| --- | --- | --- |
| Contato PF (US06) | `Novo contato pelo site: <nome>` | Nome, telefone, e-mail e mensagem |
| Orçamento formal pelo simulador (US07) | `Novo orçamento pelo simulador: <empresa>` | Empresa, CNPJ, telefone, e-mail, prazo, peças (com os nomes do catálogo), faixa de preço e observações |
| Orçamento por PDF (US07) | `Novo orçamento por PDF: <empresa>` | Os dados da empresa, o prazo e as observações, com o PDF anexado (`projeto-<CNPJ>.pdf`) |

Calcular a faixa no simulador (`POST /quotes/estimator/price-range`) não gera aviso: a faixa serve só para o cliente ter uma noção do valor. O aviso sai quando ele pede o orçamento formal (`POST /quotes/estimator`).

O `Reply-To` é o e-mail de quem fez o pedido, então quem recebe o aviso responde direto. O envio acontece depois da resposta ao visitante: se o SMTP falhar, o pedido continua registrado e a falha só aparece no log.

No desenvolvimento e nos testes, o servidor de e-mail é o **Mailpit**, que sobe no `docker compose`: ele guarda os e-mails em vez de entregar, com a caixa de entrada em [http://localhost:8025](http://localhost:8025). Os testes de integração conferem o aviso pela API dele.

Em produção, configure as variáveis `SMTP_*` com o e-mail do cliente (por exemplo, o Gmail ou o Google Workspace da empresa, com uma senha de app) e o `NOTIFICATION_EMAIL` com o endereço que deve receber os avisos.

### Proteção contra spam

O formulário de contato e o de orçamento são públicos, então um script pode tentar inundar o banco ou a caixa de entrada da empresa. Há três camadas, todas em memória, que voltam a zero quando a API reinicia:

- **Limite por IP:** 5 contatos, 10 orçamentos (somando simulador e PDF) e 60 cálculos de faixa por hora para cada IP. Acima disso, a API responde 429. O IP é o do visitante, vindo do `X-Forwarded-For` do proxy do Frontend, como no login. O limite roda antes da validação e do upload, então um script bloqueado nem envia o PDF.
- **Honeypot no contato:** o site manda um campo `website` escondido, que pessoas não veem. Quando ele chega preenchido, a API responde como sucesso, mas não grava nem avisa. Fica fora do Swagger.
- **CAPTCHA (Cloudflare Turnstile):** o contato e os dois orçamentos exigem o token (o cálculo da faixa, que não grava nem avisa, não exige) do widget do site no header `X-Captcha-Token`. O Backend confere o token na Cloudflare com a `TURNSTILE_SECRET_KEY`; sem token, com token inválido, sem a chave ou com a Cloudflare fora do ar, responde 403 ("Confirme que você não é um robô e tente de novo."). A verificação roda depois do limite por IP, então um script sem CAPTCHA continua sendo contado e não consulta a Cloudflare em sequência. Em produção, o cliente cria um widget no painel da Cloudflare (o mesmo da conta do R2) e configura a chave secreta aqui e a chave do site no Frontend. Nos testes de integração, um verificador falso substitui a Cloudflare.
- **Liberação da suíte Selenium:** com `E2E_CAPTCHA_TOKEN` definido, o header `X-Captcha-Token` igual a esse segredo passa sem consultar a Cloudflare. É o que a suíte de ponta a ponta do Frontend usa contra produção, já que a Cloudflare não aprova desafio resolvido por navegador automatizado. Os envios com o token também não contam no limite por IP, para que os ensaios e a apresentação não esbarrem nele; um token errado conta normalmente. Sem a variável, a liberação não existe. Gere o valor com `openssl rand -hex 32`, configure no servidor e no `.env` de quem roda a suíte, e troque depois da apresentação se quiser.
- **Teto de avisos:** no máximo 20 e-mails de aviso por hora para a empresa, somando contatos e orçamentos. Acima disso, o pedido é gravado e aparece na área interna, mas sem e-mail. Vale mesmo contra um ataque espalhado por muitos IPs.


## Autenticação

A área interna autentica de dois jeitos, conforme a [ADR 0007](https://eldo-eletrostatica.github.io/Documentacao/adr/0007-autenticacao-por-cookie/):

- **Site (cookie):** o `POST /auth/login` grava o cookie `session`, com o JWT (`HttpOnly`), e o cookie `csrf_token`, legível pelo Frontend, ambos com `SameSite=Strict` e validade de 8 horas. O Frontend chama a API pelo proxy `/api` do próprio site. Em toda escrita (POST, PATCH, PUT ou DELETE), ele manda o valor do `csrf_token` no header `X-CSRF-Token`. Sem o header, ou com outro valor, a API responde 403. O `POST /auth/logout` apaga os dois cookies.
- **Swagger, testes e outros clientes (Bearer):** o login também devolve o `accessToken` no corpo. Com o header `Authorization: Bearer <token>`, nenhuma rota exige o `X-CSRF-Token`. No Swagger, use o botão **Authorize**.

O login tem dois limites de **erros** por minuto. Ao atingir qualquer um deles, responde 429 até o minuto passar:

- **5 erros para a mesma conta (e-mail) vindos do mesmo IP**, contra quem tenta adivinhar a senha de um funcionário. Como o IP entra na conta, quem ataca a partir de outro IP não trava o funcionário verdadeiro.
- **20 erros vindos do mesmo IP**, em qualquer conta, contra quem testa poucas senhas em muitas contas.

Só a senha errada (401) conta. Um login certo não entra no limite e zera os erros daquela conta naquele IP. Por isso, quem erra algumas vezes e depois acerta não fica bloqueado, e vários funcionários entrando pela mesma rede não gastam o limite do IP.

O IP do visitante vem do último valor do header `X-Forwarded-For`, que o proxy do Frontend acrescenta. Por isso, **em produção a API precisa ficar acessível só pelo proxy**: exposta direto na internet, qualquer um poderia mandar um `X-Forwarded-For` falso e escapar dos limites. O contador fica em memória, então volta a zero quando a API reinicia.

Em desenvolvimento, o administrador inicial é `admin@eldo.com.br` com a senha `Admin@123` (variáveis `INITIAL_ADMIN_*`), criado no primeiro login quando ainda não existe nenhum administrador.

### Dados de demonstração

Para o dashboard e os relatórios terem o que mostrar no desenvolvimento, crie os dados de demonstração com a stack de pé:

```bash
docker compose exec backend npm run seed:demo
```

| Login | Senha | Nível de acesso |
| --- | --- | --- |
| `gestor.demo@eldo.com.br` | `Gestor@2026` | gestor (vê o Dashboard e os Relatórios) |

O comando cria esse gestor, 4 tipos de pintura e 2 materiais da peça, e 15 pedidos espalhados pelo mês atual e pelos cinco anteriores, com orçamentos, vendas e uma venda direta. As datas são calculadas a partir do dia em que o comando roda, então o filtro "Este mês" do dashboard sempre tem dados. Tudo leva "(Demo)" ou "Demo" no nome.

Rodar de novo não duplica nada: se o gestor demo já existe, o comando avisa e para. Ele também se recusa a rodar com `NODE_ENV=production`, para pedidos falsos nunca chegarem ao banco do cliente.

## Imagem de produção

O `Dockerfile` tem um estágio `prod` com só o necessário para rodar (código compilado e dependências de produção, sem compilador nem testes), que roda como usuário `node`. Ele é o último estágio, porque o Render constrói o último estágio do `Dockerfile` e não aceita `--target`; o `docker-compose.yml` escolhe o `dev` pelo nome (`target: dev`).

```bash
docker build --target prod -t eldo-backend .
docker run -p 3000:3000 --env-file <arquivo-com-as-variaveis> eldo-backend
```

Não há passo separado de migration: a API aplica as migrations pendentes ao subir. O administrador inicial é criado no primeiro login a partir de `INITIAL_ADMIN_*` (ver [Autenticação](#autenticação)), e o `seed:demo` é só para desenvolvimento e não entra na imagem de produção.

Em produção, além das variáveis de banco e do S3 (R2), defina `JWT_SECRET` (um segredo forte, não o de desenvolvimento), `NODE_ENV=production` (a imagem já vem assim), `USE_SAMPLE_REVIEWS=false`, `CORS_ORIGINS`, `SMTP_*`, `NOTIFICATION_EMAIL`, `TURNSTILE_SECRET_KEY` (a chave de produção, par da do site no Frontend) e a senha do administrador inicial. Os cookies de sessão saem com `Secure`, então o site precisa de HTTPS.

Com `NODE_ENV=production`, a API se recusa a subir, listando todos os problemas de uma vez, quando:

- o `JWT_SECRET` é o do `.env.example` ou tem menos de 32 caracteres, porque quem lê o repositório poderia assinar uma sessão;
- falta o `SMTP_HOST` ou o `NOTIFICATION_EMAIL`, porque os avisos de contato e de orçamento deixariam de sair sem ninguém perceber;
- o `TURNSTILE_SECRET_KEY` é uma das chaves de teste da Cloudflare, que aprovam (ou recusam) qualquer token.
- o `E2E_CAPTCHA_TOKEN` é o do `.env.example` ou tem menos de 32 caracteres, porque quem o adivinhar envia os formulários sem CAPTCHA.

O Swagger (`/api`) também sai do ar em produção, porque mostra todas as rotas a quem tentar atacar. Para ligá-lo, defina `ENABLE_SWAGGER=true`.

## Deploy no Render

Há dois ambientes, cada um com seu Blueprint:

| Ambiente | Blueprint | Branch publicada | Para quê |
| --- | --- | --- | --- |
| Homologação | `render.homolog.yaml` | `main` | Validar cada mudança, rodar a suíte Selenium e testar sem tocar nos dados da Eldo |
| Produção | `render.yaml` | `producao` | O site que os clientes da Eldo usam |

O caminho de uma mudança:

1. A branch da tarefa entra na `main` por PR, com o CI verde.
2. O Render publica a `main` na homologação, assim que o CI do commit passa (`autoDeployTrigger: checksPass`).
3. Alguém do grupo valida na homologação.
4. Um PR da `main` para a `producao` promove a mudança. Qualquer pessoa do grupo pode aprovar.
5. O Render publica a `producao` na produção, de novo só depois do CI passar.

Uma correção urgente segue o mesmo caminho. Se algo der errado em produção, o Render volta ao deploy anterior pelo botão Rollback do serviço.

### Produção

O `render.yaml` cria de uma vez, na região `virginia` (a mais perto do Brasil):

- a API (`eldo-api`), como private service Starter;
- o site (`eldo-site`, do repositório do Frontend), como web service Starter;
- o PostgreSQL (`eldo-db`), no plano `basic-256mb`, com 5 GB de disco e aumento automático.

Só o site fica na internet. A API recebe tráfego apenas do site, pela rede privada do Render, que só funciona entre serviços da mesma região. O site acha a API pela `API_HOSTPORT`, preenchida pelo próprio Render quando a API é criada. Os custos, a arquitetura e os testes de carga estão na [documentação de deploy](https://eldo-eletrostatica.github.io/Documentacao/deploy/hospedagem-e-custos/).

#### Antes de criar o Blueprint

**Cloudflare R2**, onde ficam as imagens e os PDFs (ADR 0006):

1. Em R2, crie o bucket `eldo`.
2. Nas configurações do bucket, em Public access, ligue o endereço `r2.dev`. Ele é a `S3_PUBLIC_URL` da API e a `STORAGE_PUBLIC_URL` do site (`https://pub-<id>.r2.dev`, sem barra no fim).
3. Em Manage API tokens, crie um token com permissão Object Read & Write, só para o bucket `eldo`. Guarde o Access Key ID, o Secret Access Key e o endpoint S3 da conta (`https://<id-da-conta>.r2.cloudflarestorage.com`).

O banco guarda a URL completa de cada arquivo. Se o bucket ganhar um domínio próprio depois, deixe o `r2.dev` ligado, ou as imagens já enviadas deixam de abrir.

**Turnstile:** em Turnstile, crie um widget no modo Managed com o hostname do site (`eldo-site.onrender.com`, ou o endereço que o Render der ao serviço). Guarde a chave do site e a chave secreta.

**E-mail:** a conta que envia os avisos precisa de uma senha de app (no Gmail, ligue a verificação em duas etapas e vá em Segurança, Senhas de app).

#### Criando

No painel do Render, em New, Blueprint, escolha este repositório. O Render pede os valores marcados com `sync: false`:

| Variável | Serviço | Valor |
| --- | --- | --- |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | eldo-api | Login do primeiro administrador, criado no primeiro acesso |
| `S3_ENDPOINT` | eldo-api | Endpoint S3 da conta do R2 |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | eldo-api | As chaves do token do R2 |
| `S3_PUBLIC_URL` | eldo-api | Endereço `r2.dev` do bucket |
| `SMTP_USER`, `SMTP_PASSWORD` | eldo-api | O e-mail que envia os avisos e a senha de app dele |
| `SMTP_FROM` | eldo-api | `Site Eldo <email-que-envia@gmail.com>` |
| `NOTIFICATION_EMAIL` | eldo-api | Quem recebe os avisos de contato e orçamento |
| `TURNSTILE_SECRET_KEY` | eldo-api | Chave secreta do widget do Turnstile |
| `STORAGE_PUBLIC_URL` | eldo-site | O mesmo endereço `r2.dev` da `S3_PUBLIC_URL` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | eldo-site | Chave do site do widget do Turnstile |

O banco, a `API_HOSTPORT`, o `JWT_SECRET` (gerado pelo Render) e o restante já vêm preenchidos. A `STORAGE_PUBLIC_URL` e a chave do site entram no build do Frontend: depois de trocar uma delas, faça um novo deploy do site. Se o endereço do site sair diferente de `eldo-site.onrender.com`, porque o nome já existia no Render, corrija o hostname do widget do Turnstile.

#### Depois do primeiro deploy

- **IP do visitante:** confira nos logs se o IP do visitante chega certo. Se o `X-Forwarded-For` trouxer o IP do balanceador do Render, todos os visitantes contam como um IP só nos limites de envio e de login.
- **Avaliações do Google:** sem a `GOOGLE_PLACES_API_KEY` (#65), a página inicial avisa que as avaliações estão indisponíveis. Quando a chave existir, cadastre-a no painel da API e faça um novo deploy.
- **Suíte Selenium:** para rodar a suíte contra o site no ar, cadastre na API a `E2E_CAPTCHA_TOKEN`, com 32 caracteres ou mais (`openssl rand -hex 32`), e passe o mesmo valor a quem roda a suíte. Sem a variável, o CAPTCHA não tem exceção.

### Homologação

O `render.homolog.yaml` cria a API (`eldo-api-homolog`) e o site (`eldo-site-homolog`) em instâncias grátis do Render: eles dormem depois de 15 minutos sem acesso, e o primeiro acesso seguinte leva cerca de 1 minuto. A API fica pública, porque um web service grátis não usa a rede privada. O banco é um projeto do Neon (`eldo-homolog`, região AWS us-east-1), porque o PostgreSQL grátis do Render expira em 30 dias e o do Neon não.

Antes de criar o Blueprint:

- **Neon:** no projeto `eldo-homolog`, em Connect, copie o host, o usuário, a senha e o banco da conexão **direta** (desligue a opção Connection pooling): as migrations rodam quando a API sobe.
- **R2:** crie o bucket `eldo-homolog`, ligue o endereço `r2.dev` dele e dê ao token da API acesso também a esse bucket (ou crie um token só para ele).
- **Turnstile:** acrescente `eldo-site-homolog.onrender.com` aos hostnames do widget da produção.

No painel do Render, em New, Blueprint, escolha este repositório e informe `render.homolog.yaml` como caminho do arquivo. O Render pede:

| Variável | Serviço | Valor |
| --- | --- | --- |
| `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | eldo-api-homolog | A conexão direta do Neon |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | eldo-api-homolog | Login do administrador da homologação |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | eldo-api-homolog | O endpoint da conta do R2 e o token com acesso ao `eldo-homolog` |
| `S3_PUBLIC_URL` | eldo-api-homolog | O endereço `r2.dev` do bucket `eldo-homolog` |
| `TURNSTILE_SECRET_KEY` | eldo-api-homolog | A mesma chave secreta da produção |
| `API_URL` | eldo-site-homolog | `https://eldo-api-homolog.onrender.com`, ou o endereço que o painel mostrar |
| `STORAGE_PUBLIC_URL` | eldo-site-homolog | O mesmo endereço `r2.dev` da `S3_PUBLIC_URL` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | eldo-site-homolog | A mesma chave do site da produção |

O `JWT_SECRET` e o `E2E_CAPTCHA_TOKEN` são gerados pelo Render. O `E2E_CAPTCHA_TOKEN` libera a suíte Selenium do CAPTCHA e existe **só** na homologação: quem o tiver envia os formulários públicos sem CAPTCHA e sem limite por IP, então ele nunca vai para a produção. Para rodar a suíte, copie o valor do painel da `eldo-api-homolog`.

Os avisos por e-mail não saem da homologação: um web service grátis não envia nas portas do SMTP, e o `NOTIFICATION_EMAIL` aponta para um endereço inválido de propósito, para nenhum teste chegar ao cliente.

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

Todo PR para a `main` ou para a `producao` e todo push nelas rodam o workflow `.github/workflows/ci.yml` no GitHub Actions: `npm ci`, `lint:check`, `build`, testes unitários e testes de integração contra um Postgres de serviço.

A `main` e a `producao` são protegidas: só recebem mudanças por PR, e o PR só pode ser mergeado com o check **Lint, build e testes** verde e a branch atualizada. A regra vale também para administradores. O Render espera esse mesmo check para publicar (ver [Deploy no Render](#deploy-no-render)).

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

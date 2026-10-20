<!--
Bloco comum: idêntico nos repos Frontend, Backend e Documentacao, assim como
GLOSSARY.md e docs/agents/. A cópia de referência é a da Documentacao: altere
lá e replique nos outros dois repos. A seção específica de cada repo fica no
fim deste arquivo.
-->

# Eldo Eletrostática

Site institucional com área de gestão interna para a Eldo Eletrostática, empresa de pintura eletrostática. É o projeto da disciplina TPPE: módulos como estoque, comissões e dashboards existem por exigência da disciplina, mesmo indo além da operação real do cliente. Trate toda User Story aberta como escopo válido.

## Repositórios

Três repositórios separados na organização `Eldo-Eletrostatica`, que se comunicam só por API REST:

- `Frontend`: Next.js (App Router) e TypeScript.
- `Backend`: NestJS no padrão MVC (Controller, Service, Entity), TypeORM e PostgreSQL.
- `Documentacao`: MkDocs Material, publicado no GitHub Pages.

## Requisitos

As regras de produto vêm das User Stories. Cada US é uma issue no repo `Documentacao` (`gh issue view <n> --repo Eldo-Eletrostatica/Documentacao`), com sub-issues técnicas no `Frontend` e no `Backend`. Leia a US antes de implementar uma funcionalidade. A US04 (avaliação feita no próprio site) foi descontinuada: as avaliações vêm só do Google (US05).

Quando o texto de uma US contradiz uma ADR, vale a ADR. Aponte a diferença para o grupo ajustar a US, em vez de implementar o texto antigo.

## Decisões de arquitetura

As decisões que valem para os três repos são ADRs no repo `Documentacao`, em `docs/adr/`, publicadas em https://eldo-eletrostatica.github.io/Documentacao/. Antes de mexer em banco, módulos ou integrações, leia a ADR da área (`gh api repos/Eldo-Eletrostatica/Documentacao/contents/docs/adr/<arquivo> --jq .content | base64 -d`). Código que contradiz uma ADR só entra com uma ADR nova que a revise, aprovada pelo grupo.

O que cada uma obriga:

- **0001 (chaves UUID e protocolo aleatório):** toda PK é UUID. O protocolo da OS é aleatório, com 8 caracteres e sem 0, O, 1 e I, nunca sequencial.
- **0002 (exclusão lógica seletiva):** só `employees`, `customers`, `catalog_items` e `inventory_items` têm `deleted_at`; as demais tabelas apagam de verdade.
- **0003 (preços e comissões congelados):** o item do pedido copia o preço por m² e o fator do catálogo, e a venda guarda a comissão calculada no lançamento. Mostre sempre o valor guardado, nunca recalcule.
- **0004:** substituída pela 0005.
- **0005 (modelo de 9 tabelas):** não crie tabela sem uma ADR que revise esta. Contato, orçamento, venda e OS são etapas de `orders`; tipos de pintura e materiais ficam em `catalog_items`; portfólio e eventos em `showcase_items`; categoria e fornecedor são texto no próprio registro; a comissão é uma regra por funcionário, em `employees`.
- **0006 (armazenamento):** imagens e PDFs ficam num armazenamento compatível com S3 (SeaweedFS no desenvolvimento, Cloudflare R2 do cliente em produção), e o banco guarda só a URL.

Ao criar ou alterar uma ADR, atualize esta lista nos três repos.

## Idioma

- Código em inglês: arquivos, variáveis, funções, classes, tabelas, colunas e comentários.
- Português do Brasil no resto: documentação, issues, PRs, mensagens de commit e textos exibidos ao usuário.

## Nomes

Ao nomear um conceito do domínio (orçamento, OS, categoria...), use o termo definido em `GLOSSARY.md`. Ele mapeia cada termo do negócio para um único nome em inglês, para que agentes diferentes cheguem ao mesmo nome.

| Onde | Padrão | Exemplo |
| --- | --- | --- |
| Variáveis, funções, métodos | camelCase | `estimatedPriceRange`, `findOverdueServiceOrders()` |
| Classes, tipos, componentes React | PascalCase | `QuoteItem`, `PortfolioGallery` |
| Constantes | UPPER_SNAKE_CASE | `MAX_PROJECTS_PER_CATEGORY` |
| Tabelas e colunas do PostgreSQL | snake_case | `service_orders.created_at` |

O nome diz o que o valor é ou o que a função faz, por extenso (`quantity`, `customerEmail`). Booleanos começam com `is`, `has` ou `can`; funções começam com um verbo.

## Código humanizado

É o recorte de SOLID adotado para a disciplina: código que outra pessoa do grupo entende lendo uma vez. Cada função faz uma coisa, cada classe tem uma responsabilidade e valores com significado de negócio viram constantes nomeadas.

Comentários registram o porquê técnico: uma restrição, um contorno, uma regra de negócio não óbvia. O histórico de como o código chegou ali vai na mensagem de commit.

## Escrita

Ao escrever texto em português (documentação, README, issue, PR, commit), siga `docs/agents/writing.md`.

## Git

- Commits no padrão Conventional Commits, com o tipo em inglês e a descrição em português: `feat: adiciona upload de PDF no orçamento`.
- Uma branch por tarefa, criada a partir da `main` (`feat/`, `fix/`, `docs/`, `test/`, `chore/`) e integrada por PR.
- Commit e push acontecem quando a pessoa pede.
- Commits e PRs levam só a autoria humana, sem linhas de atribuição a agentes.

## Agent skills

### Issue tracker

GitHub: USs no repo `Documentacao`, sub-issues técnicas nos repos de código, tudo no mesmo Project. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `GLOSSARY.md` na raiz de cada repo; as ADRs ficam só no repo `Documentacao`, em `docs/adr/`, com o resumo em "Decisões de arquitetura" acima. See `docs/agents/domain.md`.

## Este repo: Backend

- Arquitetura MVC em camadas, com uma pasta por entidade. O controller é o Controller do MVC; o Model se divide em entity (os dados, a tabela) e service (a regra de negócio, a camada a mais); os DTOs definem o formato dos dados que entram e saem, e a View é o Frontend. O controller recebe a requisição, chama o service e devolve a resposta.
- As 9 tabelas do modelo (ADR 0005) já têm pasta, entity e module em `src/<feature>/`. Ao implementar uma US de uma feature que já existe, gere pelo CLI do Nest só o que falta, na raiz do repo; o CLI registra o controller e o service no module existente:

  ```bash
  npx -p @nestjs/cli@11 nest g controller <feature>
  npx -p @nestjs/cli@11 nest g service <feature>
  ```

  Uma feature nova, sem pasta, nasce com `npx -p @nestjs/cli@11 nest g resource <nome> --type rest --crud`. O `<nome>` vem do `GLOSSARY.md`, em inglês, kebab-case e no plural (`service-orders`): ele vira a pasta e a rota (`/service-orders`), e a entity e os DTOs saem no singular (`ServiceOrder`). O comando baixa o CLI porque o `node_modules` do host fica vazio: as dependências vivem no container.
- O pedido passa por várias USs: contato, orçamento, venda, OS e consulta pelo protocolo (ADR 0005). `src/orders/` guarda só as entities `Order` e `OrderItem`. Cada caso de uso sobre o pedido tem módulo próprio, com o nome do termo do `GLOSSARY.md` (`src/sales/` para a venda da US21), com controller, service e DTOs, e importa o `OrdersModule` e os módulos das outras entities que usa. Assim cada US fica na sua pasta, sem disputar o mesmo service.
- Arquivos (imagens e PDFs) passam pelo `StorageService` de `src/storage/` (ADR 0006): a feature importa o `StorageModule`, valida o formato e o tamanho do arquivo e chama `upload(arquivo, pasta)`, que devolve a URL a salvar no banco. Não instale outro SDK nem fale com o bucket por fora dele.
- A entity gerada pelo `nest g resource` vem vazia. Adicione os decorators do TypeORM e registre a entity no module com `TypeOrmModule.forFeature([<Entity>])`; o `autoLoadEntities` do `app.module.ts` só carrega as entities registradas assim.
- As entities usam propriedades em camelCase, gravadas no banco em snake_case pelo `SnakeNamingStrategy` (pacote `typeorm-naming-strategies`, configurado em `src/database/typeorm.config.ts`).
- A PK de cada tabela se chama `<entidade>_id`, no singular (`customers.customer_id`, propriedade `customerId`), e não `id`. Uma FK tem exatamente o nome da PK que ela referencia (`orders.customer_id`). Quando a FK representa um papel, o papel vira prefixo do nome da PK (`orders.seller_employee_id`, `order_items.paint_catalog_item_id`). Declare o nome em toda relação com `@JoinColumn({ name: 'customer_id' })`: sem isso, o `SnakeNamingStrategy` junta o nome da relação ao da PK e gera `customer_customer_id`.
- Siga o padrão das entities existentes: a FK é declarada como coluna (`customerId`, com `@Index`) logo antes da relação (`customer`); toda constraint tem nome (`PK_`, `FK_`, `IDX_`, `UQ_`, `CHK_` + tabela + coluna); enums são `varchar` com `@Check(enumCheck(...))`; colunas `numeric` saem dos helpers de `src/database/columns.ts` (`moneyColumn()`, `stockQuantityColumn()`...), que já aplicam o `numericTransformer`; tamanhos e limites com significado de negócio viram constantes (`EMAIL_MAX_LENGTH`, `MAX_PERCENTAGE`); `created_at`, `updated_at` e, nas tabelas da ADR 0002, `deleted_at` ficam no fim da classe.
- O banco só muda por migration: o `synchronize` fica desligado e a API aplica as migrations pendentes ao subir. Depois de alterar uma entity, gere a migration com `docker compose exec backend npm run migration:generate -- src/database/migrations/<NomeDaMudanca>` e revise o SQL antes de commitar. Uma migration que já está na `main` não muda: corrija com uma migration nova.
- Testes: unitários em `*.spec.ts` ao lado do arquivo testado; integração de endpoint em `test/*.e2e-spec.ts`, com supertest. Teste parametrizado usa `it.each` com pelo menos dois parâmetros por caso (exigência da disciplina).
- Os testes de integração precisam do Postgres do `docker compose` no ar.
- Pelo `docker compose`, a API responde em `localhost:3001` (porta 3000 dentro do container), porque a 3000 do host é do Frontend.
- Antes de dar uma tarefa por pronta, rode `npm run lint`, `npm run test` e, se mexeu em endpoint ou banco, `npm run test:e2e`. O PR só entra na `main` com o CI (`.github/workflows/ci.yml`) verde e a branch atualizada; um `package.json` alterado vai junto com o `package-lock.json`, porque o CI usa `npm ci`.

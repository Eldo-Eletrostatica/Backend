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

As regras de produto vêm das User Stories. Cada US é uma issue no repo `Documentacao` (`gh issue view <n> --repo Eldo-Eletrostatica/Documentacao`), com sub-issues técnicas no `Frontend` e no `Backend`. Leia a US antes de implementar uma funcionalidade. Dois pontos que já confundiram:

- A US04 (avaliação feita no próprio site) foi descontinuada: as avaliações vêm só do Google (US05).
- O serviço de armazenamento de arquivos ainda está em avaliação pelo grupo. Pergunte antes de integrar um.

## Idioma

- Código em inglês: arquivos, variáveis, funções, classes, tabelas, colunas e comentários.
- Português do Brasil no resto: documentação, issues, PRs, mensagens de commit e textos exibidos ao usuário.

## Nomes

Ao nomear um conceito do domínio (orçamento, OS, categoria...), use o termo definido em `GLOSSARY.md`. Ele mapeia cada termo do negócio para um único nome em inglês, para que agentes diferentes cheguem ao mesmo nome.

| Onde | Padrão | Exemplo |
| --- | --- | --- |
| Variáveis, funções, métodos | camelCase | `estimatedPriceRange`, `findOverdueServiceOrders()` |
| Classes, tipos, componentes React | PascalCase | `QuoteRequest`, `PortfolioGallery` |
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

Single-context: `GLOSSARY.md` e `docs/adr/` na raiz de cada repo. See `docs/agents/domain.md`.

## Este repo: Backend

- Arquitetura MVC em camadas, com uma pasta por entidade. O controller é o Controller do MVC; o Model se divide em entity (os dados, a tabela) e service (a regra de negócio, a camada a mais); os DTOs definem o formato dos dados que entram e saem, e a View é o Frontend. O controller recebe a requisição, chama o service e devolve a resposta.
- Crie cada módulo pelo CLI do Nest, na raiz do repo, e mantenha a estrutura que ele gera:

  ```bash
  npx -p @nestjs/cli@11 nest g resource <nome> --type rest --crud
  ```

  O `<nome>` vem do `GLOSSARY.md`, em inglês, kebab-case e no plural (`service-orders`): ele vira a pasta e a rota (`/service-orders`), e a entity e os DTOs saem no singular (`ServiceOrder`). O comando baixa o CLI porque o `node_modules` do host fica vazio: as dependências vivem no container.
- A entity gerada vem vazia. Adicione os decorators do TypeORM e registre a entity no módulo com `TypeOrmModule.forFeature([<Entity>])`; o `autoLoadEntities` do `app.module.ts` só carrega as entities registradas assim.
- As entities usam propriedades em camelCase, gravadas no banco em snake_case pelo `SnakeNamingStrategy` (pacote `typeorm-naming-strategies`). Se ele ainda não estiver configurado no `TypeOrmModule` de `app.module.ts`, configure antes de criar a primeira entity.
- Testes: unitários em `*.spec.ts` ao lado do arquivo testado; integração de endpoint em `test/*.e2e-spec.ts`, com supertest. Teste parametrizado usa `it.each` com pelo menos dois parâmetros por caso (exigência da disciplina).
- Os testes de integração precisam do Postgres do `docker compose` no ar.
- Pelo `docker compose`, a API responde em `localhost:3001` (porta 3000 dentro do container), porque a 3000 do host é do Frontend.
- Antes de dar uma tarefa por pronta, rode `npm run lint` e `npm run test`.

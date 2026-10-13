# Issue tracker: GitHub

As issues ficam no GitHub da organização `Eldo-Eletrostatica`, organizadas no Project "Eldo Eletrostática - Backlog" (projeto nº 1 da organização). Use o `gh` CLI e passe sempre `--repo Eldo-Eletrostatica/<repo>`, porque a US e suas sub-issues ficam em repos diferentes.

## Modelo

- **User Story**: issue no repo `Documentacao`. Título `USnn - <resumo>`; corpo com a história e uma seção `## Critérios de Aceite` em Dado/quando/então; label do épico (`epico:<nome>`).
- **Sub-issue técnica**: issue no `Frontend` e/ou no `Backend`, ligada à US como sub-issue. Título `USnn - Frontend: <resumo>` ou `USnn - Backend: <resumo>`; corpo com o escopo técnico daquele repo e o link da US; mesma label de épico.
- Todo item entra no Project com os campos **Status** (Backlog, Ready, Em andamento, Em revisão, Concluído) e **Épico** preenchidos.

## Conventions

- **Create a US**: `gh issue create --repo Eldo-Eletrostatica/Documentacao --title "..." --body "..." --label "epico:<nome>"`. Use a heredoc for multi-line bodies.
- **Create a technical sub-issue**: `gh issue create --repo Eldo-Eletrostatica/<Frontend|Backend> --title "..." --body "..." --label "epico:<nome>" --parent <url-da-US>`.
- **Read an issue**: `gh issue view <number> --repo Eldo-Eletrostatica/<repo> --comments`.
- **List issues**: `gh issue list --repo Eldo-Eletrostatica/<repo> --state open --json number,title,labels`.
- **Comment on an issue**: `gh issue comment <number> --repo Eldo-Eletrostatica/<repo> --body "..."`.
- **Close**: `gh issue close <number> --repo Eldo-Eletrostatica/<repo> --comment "..."`; a US that will not be done closes with `--reason "not planned"`.
- **Project fields**: add items and set Status/Épico with GraphQL mutations by ID (`addProjectV2ItemById`, `updateProjectV2ItemFieldValue`). `gh project item-edit` with `--field`/`--url` resolves names on every call and exhausts the GraphQL rate limit when run in bulk.

## When a skill says "publish to the issue tracker"

Create a GitHub issue following the model above: a US in `Documentacao`, or a technical sub-issue in a code repo linked to its US.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo Eldo-Eletrostatica/<repo> --comments`. For a technical sub-issue, also read its parent US in `Documentacao`, where the acceptance criteria live.

# Como contribuir

Guia de trabalho do grupo no projeto Eldo Eletrostática, para quem usa agentes de IA. Este arquivo é igual nos três repositórios (`Frontend`, `Backend` e `Documentacao`); a cópia de referência fica na `Documentacao`.

As regras de idioma, nomes, código, escrita e git ficam no `AGENTS.md` e valem tanto para os agentes quanto para as pessoas.

## Arquivos de instrução

| Arquivo | Para que serve |
| --- | --- |
| `AGENTS.md` | Regras do projeto que todo agente lê ao começar. Tem um bloco comum e uma seção específica de cada repo. |
| `CLAUDE.md` | Só importa o `AGENTS.md`, porque o Claude Code procura esse nome de arquivo. |
| `GLOSSARY.md` | Glossário do domínio: o nome em inglês de cada termo do negócio (orçamento vira `Quote`, OS vira `ServiceOrder`). |
| `docs/agents/writing.md` | Guia de escrita para todo texto em português: docs, issues, PRs e commits. |
| `docs/agents/issue-tracker.md` e `docs/agents/domain.md` | Configuração das skills de Matt Pocock: onde ficam as issues, o glossário e as decisões. |
| `CONTRIBUTING.md` | Este guia. |

Ao alterar um desses arquivos, faça a mudança na `Documentacao` e replique nos outros dois repos. A exceção é a seção "Este repo" do `AGENTS.md`, que é própria de cada um.

## Configurando o seu agente

- **Codex, Cursor e GitHub Copilot** leem o `AGENTS.md` da raiz do repo sem configuração extra.
- **Claude Code** lê o `CLAUDE.md`, que importa o `AGENTS.md`.
- **Gemini CLI** procura o `GEMINI.md` por padrão. Nas configurações dele, aponte o arquivo de contexto para `AGENTS.md`.

## Instalando as skills de Matt Pocock

As [skills de Matt Pocock](https://github.com/mattpocock/skills) ensinam o agente a alinhar a tarefa antes de codar, escrever testes e revisar código. Cada pessoa instala no próprio computador.

Pré-requisitos:

- Node.js 22.20 ou mais recente (`node --version`).
- GitHub CLI autenticado (`gh auth login`), porque as skills leem e criam issues por ele.

Instale com o comando abaixo, trocando `<agente>` pelo seu: `claude-code`, `codex`, `cursor`, `gemini-cli` ou `github-copilot`. Dá para passar mais de um, separados por espaço.

```bash
npx skills@latest add mattpocock/skills -g -y -a <agente> \
  -s grill-with-docs grilling domain-modeling implement tdd codebase-design code-review pr diagnosing-bugs
```

- `-g` instala no seu usuário, fora do repositório, para que os arquivos das skills não entrem em nenhum commit.
- A lista já inclui as dependências: `grill-with-docs` usa `grilling` e `domain-modeling`, `implement` usa `tdd` e `code-review`, e `tdd` usa `codebase-design`.
- Para atualizar: `npx skills@latest update -g`. As skills mudam com frequência (o arquivo de glossário já mudou de nome uma vez), então atualizem na mesma época, para o grupo usar a mesma versão.

Quem usa Claude Code instala pelo comando acima, e não pelo plugin `mattpocock-skills` do marketplace, para ficar na mesma versão que o resto do grupo. Com os dois instalados, cada skill aparece duas vezes.

Não rodem o `setup-matt-pocock-skills`. A configuração que ele gera já está em `docs/agents/`, e, como os repos têm um `CLAUDE.md`, ele gravaria a configuração só ali, onde os outros agentes não enxergam.

## Fluxo de trabalho

Este é o fluxo principal recomendado por Matt Pocock (a skill `ask-matt` descreve o original), adaptado ao nosso backlog: as USs e as sub-issues já existem no GitHub Projects, então cada sub-issue é o ticket que o agente implementa.

### Implementar uma sub-issue

1. **Pegue a tarefa.** No Project, escolha uma sub-issue em Ready, atribua a você (`gh issue edit <n> --add-assignee @me`) e mova para Em andamento.
2. **Leia a US pai.** Os critérios de aceite ficam na US, no repo `Documentacao`.
3. **Crie a branch** a partir da `main` antes de chamar o agente, porque o `/implement` faz commit na branch atual ao terminar: `git switch -c feat/us07-upload-pdf origin/main`.
4. **Alinhe, se houver decisão em aberto.** Quando a tarefa pede uma decisão de design ainda não tomada (as tabelas de um módulo, o formato de um endpoint), rode `/grill-with-docs`. O agente entrevista você até o plano fechar e registra termos novos no `GLOSSARY.md` e decisões em `docs/adr/`. Tarefa direta pula este passo.
5. **Implemente:** `/implement <link da sub-issue>`. O agente combina com você onde ficam os testes, implementa em ciclos de teste vermelho e verde (`/tdd`), roda os testes, revisa o próprio trabalho (`/code-review`) e faz o commit.
6. **Abra o PR** com `gh pr create`, com `Closes #<n>` no corpo para a sub-issue fechar junto com o merge. A skill `pr` monta a descrição.
7. **Revisão:** outra pessoa do grupo roda `/code-review` na branch do PR antes de aprovar. O review confere o código contra o `AGENTS.md` e contra os critérios da US.
8. **Depois do merge,** mova a sub-issue para Concluído. Quando todas as sub-issues de uma US estiverem concluídas, confira os critérios de aceite da US e feche-a.

Comece cada sub-issue numa sessão nova do agente, ou use `/clear`: o ticket traz o contexto necessário, e a conversa anterior só ocupa espaço.

### Outros casos

- **Bug que resiste à primeira olhada:** `/diagnosing-bugs`. A skill monta um jeito de reproduzir o bug antes de propor a correção.
- **Teste avulso, sem sub-issue** (o teste parametrizado da entrega, por exemplo): `/tdd`.
- **Trabalho que ainda não está no backlog:** combine com o grupo, crie a US e as sub-issues no Project seguindo o modelo de `docs/agents/issue-tracker.md` e depois siga o fluxo acima.

### Uma vez por repo de código

Uma pessoa só configura o pre-commit no `Frontend` e no `Backend` e sobe a configuração por PR. A skill instala o Husky e o lint-staged, que formatam e checam o código antes de cada commit:

```bash
npx skills@latest add mattpocock/skills -g -y -a <agente> -s setup-pre-commit
```

Depois, dentro do repo, rode `/setup-pre-commit` no agente.

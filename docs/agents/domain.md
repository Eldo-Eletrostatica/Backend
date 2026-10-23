# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: the glossary, identical in the three repos.
- **The ADRs**: they live only in `docs/adr/` of the `Documentacao` repo, never in `Backend` or `Frontend`. The "Decisões de arquitetura" section of `AGENTS.md` summarizes what each one requires. Before working on the database, a module or an integration, read the full ADR of that area: list them with `gh api repos/Eldo-Eletrostatica/Documentacao/contents/docs/adr --jq '.[].name'` and read one with `gh api repos/Eldo-Eletrostatica/Documentacao/contents/docs/adr/<file> --jq .content | base64 -d`.

A missing `docs/adr/` in `Backend` or `Frontend` is expected: it never means there are no decisions. Don't skip the ADRs because of it.

## File structure

Single-context, with the decisions centralized in `Documentacao`:

```
Documentacao/
├── GLOSSARY.md          ← reference copy, replicated to Backend and Frontend
└── docs/adr/
    └── 0001-<decision>.md

Backend/ and Frontend/
├── GLOSSARY.md          ← copy
└── src/
```

`GLOSSARY.md` is shared by `Frontend`, `Backend` and `Documentacao`. When a term changes, update it in `Documentacao` and copy it to the other two repos. When an ADR is created or changed, update the "Decisões de arquitetura" list in the shared block of `AGENTS.md` in the three repos.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name, a variable), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_

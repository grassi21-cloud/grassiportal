---
issue: 5
legacy_id: P005
title: Projetos (Kanban, só leitura)
status: Backlog
state: open
moscow: 
labels: [portal, nas, business]
created: 2026-10-24
closed: 
url: https://github.com/grassi21-cloud/grassiportal/issues/5
---

> gerado a partir da issue #5 — não editar

# Projetos (Kanban, só leitura)

> Migrada de P005 — spec original: https://github.com/grassi21-cloud/grassiportal/blob/c0b5d699e07b85e53a3c92d0061e483e62bc5cdc/docs/backlog/P005-projetos-kanban.md (criada em 2026-10-23)

# P005 · Projetos (Kanban, só leitura)

Ideia conversada com o André (2026-10). Spec de escopo — o prompt do Claude Code vem depois,
quando refinarmos.

## O que é

Uma seção **Projetos** no portal mostrando os projetos da casa (Patri, grassiportal, …) e o
**quadro Kanban** do backlog de cada um, lido do **GitHub Projects**. **Só leitura**: para
mudar algo, abre-se o GitHub.

## Decisões

- A fonte é o GitHub Projects — depende de os backlogs estarem em Issues + Projects.
- Só leitura no portal; editar continua no GitHub (link para o item/quadro).
- Nada de segredos em `site/`: se a leitura exigir token do GitHub, ele não pode ir para o
  navegador — definir a alternativa no refinamento (ex.: arquivo gerado periodicamente).

## Em aberto

- Como ler os dados sem expor token (repositórios privados).
- Se o grassiportal também migra o backlog de `docs/backlog/` para Issues + Projects.

## Dependência

- **F127 do Patri** (move os backlogs para GitHub Issues + Projects).

## Critérios de aceite

- Seção Projetos lista os projetos e, para cada um, as colunas do quadro com os itens.
- Cada item abre no GitHub.
- Fonte indisponível → mensagem na seção; o resto da página funciona.

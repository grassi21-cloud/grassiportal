---
issue: 4
legacy_id: P004
title: "Seções futuras do portal: Fotos e Viagens"
status: Backlog
state: open
moscow: 
labels: [portal, nas, business]
created: 2026-10-24
closed: 
url: https://github.com/grassi21-cloud/grassiportal/issues/4
---

> gerado a partir da issue #4 — não editar

# Seções futuras do portal: Fotos e Viagens

> Migrada de P004 — spec original: https://github.com/grassi21-cloud/grassiportal/blob/c0b5d699e07b85e53a3c92d0061e483e62bc5cdc/docs/backlog/P004-secoes-fotos-viagens.md (criada em 2026-10-23)

# P004 · Seções futuras do portal: Fotos e Viagens

Ideia conversada com o André (2026-10). Spec de escopo — o prompt do Claude Code vem depois,
quando refinarmos.

## O que é

Duas novas seções na página inicial (`http://grassinas`), seguindo o padrão de uma seção por
aplicação da P001:

1. **Fotos** — atalho para o QuMagie e, talvez, uma **"foto do dia"** vinda do acervo da P002.
2. **Viagens** — um cartão por viagem (nome, datas, cidades) com acesso ao **roteiro** e ao
   **álbum** da viagem (P003).

## Decisões

- Continua **estático** (HTML + CSS + JS puro, sem build, sem backend próprio).
- Cada seção é uma entrada nova em `SECTIONS` no `app.js`, configurada em `site/config.js`.
- Fonte indisponível → a seção mostra uma mensagem e o resto da página funciona (como o Patri).
- Nada de segredos em `site/`.

## Em aberto

- De onde a seção Viagens lê os dados (arquivo gerado pela P003 e copiado para a pasta `Web`?).
- Se a "foto do dia" vale o esforço e como servir a imagem sem expor o acervo inteiro.

## Dependência

- **P002** (Fotos) e **P003** (Viagens).

## Critérios de aceite

- Seção Fotos com atalho para o QuMagie funcionando por `grassinas`, nome do Tailscale e IP de casa.
- Seção Viagens com um cartão por viagem do índice, abrindo roteiro e álbum.
- Bom no celular (375 px) e no monitor wide; modo escuro acompanhando o sistema.

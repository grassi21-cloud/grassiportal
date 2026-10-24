---
issue: 3
legacy_id: P003
title: Álbuns por viagem
status: Backlog
state: open
moscow: 
labels: [portal, nas, business]
created: 2026-10-24
closed: 
url: https://github.com/grassi21-cloud/grassiportal/issues/3
---

> gerado a partir da issue #3 — não editar

# Álbuns por viagem

> Migrada de P003 — spec original: https://github.com/grassi21-cloud/grassiportal/blob/c0b5d699e07b85e53a3c92d0061e483e62bc5cdc/docs/backlog/P003-albuns-por-viagem.md (criada em 2026-10-23)

# P003 · Álbuns por viagem

Ideia conversada com o André (2026-10). Spec de escopo — o prompt do Claude Code vem depois,
quando refinarmos.

## O que é

Duas etapas:

1. **Índice de viagens** — um agente lê a pasta de viagens do André no Dropbox (formatos
   misturados: planilhas Excel, PDFs, e-mails de voo) e monta **um índice único** de viagens:
   nome, data de início, data de fim e cidades. Viagens com dados duvidosos (datas
   incompletas, cidades conflitantes, documentos ambíguos) ficam **marcadas para o André
   revisar**.
2. **Álbuns** — com o índice revisado, as fotos do NAS (P002) são agrupadas por viagem, pela
   data e, quando houver, pelo local das fotos.

## Decisões

- **O índice é a fonte da verdade** das viagens; o André corrige o que estiver marcado antes
  de gerar os álbuns.
- **Fotos não são movidas nem duplicadas** à toa — o álbum referencia as fotos que já estão
  nas pastas da P002 (forma exata a definir no refinamento).
- Formato do índice (planilha, JSON, Markdown) e onde ele mora: a definir.

## Em aberto

- Como o agente acessa o Dropbox (cópia local, conector, sincronização no NAS).
- Como representar o álbum para o QuMagie / para o portal (P004).
- Fotos sem localização ou com data errada.

## Dependência

- **P002** (fotos do iCloud no NAS).

## Critérios de aceite

- Índice com todas as viagens encontradas no Dropbox, cada uma com nome, datas e cidades.
- Viagens duvidosas aparecem marcadas, com o motivo.
- Para cada viagem revisada, um álbum com as fotos do período/lugar.

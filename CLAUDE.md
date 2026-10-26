# grassiportal — instruções para o Claude Code

- Projeto simples: HTML + CSS + JavaScript puro em `site/`. Sem framework, sem build, sem npm.
- Textos da interface em português. Funcionar bem no celular (375 px) e em tela larga.
- Nada de segredos nos arquivos de `site/` (tudo ali é público para quem abre a página).
- Arquivos com fim de linha LF.

## Backlog (F127 — fonte da verdade: issue grassi21-cloud/Patri#152)
- Vive nas issues do GitHub (grassi21-cloud/grassiportal) + projeto **Projetos_Grassi** (projeto de usuário 1).
  Ler uma feature com `gh issue view <n> --comments`. O mapa P-id → #n está em `docs/backlog/README.md`
  ("Implementa a P001" = issue #1). Cada issue tem a spec e uma seção "Claude Code prompt".
- `docs/backlog/PORTAL-*.md` são EXPORTS: nunca criar nem editar à mão (um hook bloqueia). São
  (re)gerados só por `python C:\Users\andre\Projects\Patri\scripts\backlog\export.py --prefix PORTAL`
  quando a feature é fechada.
- Fluxo do Status no quadro: Backlog (funil de ideias) → Analysis (escolhida como uma das próximas; em
  refinamento no claude.ai/voz — o chat move para lá) → Ready (spec + prompt na issue) → In Progress (você move
  quando o André diz "implementa a #N") → Done. Se o cartão ainda estiver em Backlog/Analysis, mova para In Progress.
- Mover cartão = pôr a label-comando `→ coluna` (`gh issue edit N --add-label "→ in-progress"`; também `→ backlog`,
  `→ analysis`, `→ ready`). `.github/workflows/board-move.yml` move o cartão e remove a label. Nunca editar o
  campo Status direto; Done vem do fechamento da issue (Concluída em é preenchida sozinha).
- Implementar uma feature: ler a issue primeiro; antes de escrever código, resumir o que vai fazer
  (título + 2-3 frases) e pedir confirmação ao André; só prosseguir após um sim explícito.
- Feature/bug novo = issue nova (título sem prefixo, 1 label de área + 1 de tipo, adicionada ao projeto 1,
  MoSCoW definido, épico pai se houver, sem assignee).
- Toda execução (inclusive follow-ups "corrige X") = UM comentário na issue:
  `### Execução — <data hora> · commit <sha>`, depois UMA linha visível `**Resumo:** <1 frase>`, depois dois
  blocos recolhidos: `<details><summary>Prompt</summary>` e `<details><summary>Resultado</summary>`.
  No `<details>` do Prompt: a mensagem do André **e o bloco "Prompt do Claude Code" copiado literalmente
  da descrição da issue naquele momento** — nunca uma referência a ele (a descrição pode mudar depois).
  No Resultado: o que foi feito, arquivos, testes, desvios da spec, o que ficou de fora.
  Nunca colar senhas, tokens, chaves nem segredos — nem dentro do prompt.
- Commits dizem `refs #<n>` (nunca "fixes/closes"). Nunca abrir PR. Nunca fazer push — o André faz o push.
  Commit só quando o prompt pedir.
- Fechamento (sempre nesta ordem): comentário "verificada em produção" → marcar o checklist → `gh issue close`
  (Status Done + "Concluída em" vêm sozinhos; conferir no quadro) → SÓ ENTÃO exportar a issue para
  `docs/backlog` (o arquivo registra o estado fechado) → commitar (refs #n).
  Se era o último filho aberto de um épico, fechar o épico também. Cancelada = fechar como "not planned" + arquivar.

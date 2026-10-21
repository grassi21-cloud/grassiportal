---
status: backlog
created: 2026-10-21
title: "P001 · Página inicial: seção Patri (famílias) + Administração"
---

# P001 · Página inicial

Desenhada com o André em 2026-10-19/21 (vinha da F126 do Patri, separada para cá).

## O que é

`http://grassinas` abre a página "Casa Grassi", com uma **seção por aplicação**. Hoje:

1. **Patri** — um cartão por família ativa (nome + código), vindo da rota pública do Patri
   `GET /api/portal/families` (F126 do Patri: só `code` e `name`, sem template, com demo,
   CORS liberado para o portal). Clicar abre a família no Patri.
2. **Administração** — atalhos fixos (cada destino pede o próprio login):
   painel do QNAP (porta 8080), console do Patri (`:8888/admin`), Sentry
   (`https://patri.sentry.io`), GitHub do Patri (`https://github.com/grassi21-cloud/Patri`),
   Tailscale admin (`https://login.tailscale.com/admin`).

Seções futuras (fotos, viagens, projetos) entram depois — a página já nasce pronta para isso.

## Decisões

- **Estático**: HTML + CSS + JS puro, sem build.
- **Servido pelo Web Server do QNAP** (porta 80, pasta compartilhada `Web`) — sem container
  (André, 2026-10-21). O conteúdo antigo da pasta `Web` vai para `_antigo/`.
- **Links montados a partir do endereço digitado** (`location.hostname` + porta), para
  funcionar por `grassinas`, pelo nome completo do Tailscale e pelo IP de casa.
- **Configuração num arquivo só** (`site/config.js`): endereço do Patri e lista de atalhos.
- Patri fora do ar → seção mostra "Patri indisponível" (o resto da página funciona).
- **Visual caprichado mas simples**; o redesign grande do Patri (F124) pode depois inspirar
  ajustes aqui.
- Acesso só de André e Anastasia (ACL do Tailscale, passo manual). O Thiago recebe o link
  direto da família dele.

## Dependência

A seção Patri precisa da **F126 do Patri** em produção. Antes disso, a página funciona com
dados de exemplo (`?mock` no endereço) e mostra "Patri indisponível" sem eles.

## Critérios de aceite

- `http://grassinas` mostra o portal; cartões das famílias ativas (sem template).
- Clicar num cartão abre `http://<mesmo host>:8888/family/<código>/`.
- Atalhos de Administração funcionam; externos abrem em nova aba.
- Bom no celular (375 px) e no monitor wide; modo escuro acompanhando o sistema.

<details>
<summary>Claude Code prompt</summary>

```
Implement P001 (home page). Read README.md, CLAUDE.md and docs/backlog/P001-pagina-inicial.md.
Plain HTML/CSS/JS in site/, no framework, no build, no npm.

1. site/config.js: window.PORTAL_CONFIG = {
     title: "Casa Grassi",
     patri: { port: 8888 },          // Patri URL = location.protocol + "//" + location.hostname + ":" + port
     admin: [ {label, url|port+path, icon, external} ... ]   // the 5 shortcuts from the spec
   } — easy for André to edit by hand.
2. site/index.html + site/style.css + site/app.js:
   - Header "Casa Grassi" + small subtitle; sections as cards grid, centered max-width,
     generous spacing, rounded cards with subtle borders/shadows and clear hover states.
     Patri section uses the Patri green as accent. Light and dark mode via
     prefers-color-scheme. Looks good at 375 px and on a wide monitor (no stretched rows).
   - Patri section: fetch <patri>/api/portal/families; one card per family (name big, code
     small) linking to <patri>/family/<code>/. Loading skeleton; on error/timeout (5 s) show
     "Patri indisponível" with a retry link. "?mock" in the page URL uses sample data
     (Grassi, Demo) so the page can be checked before F126 is deployed.
   - Administração section: shortcuts from config (icon + label, lighter than family cards);
     host-relative ones use location.hostname + port; external ones open in a new tab
     (rel="noopener").
   - Structure the code so adding another app section later is a small change.
   - No secrets anywhere in site/.
3. deploy/publish.ps1 (PowerShell 5.1 compatible, no &&): copy site/ to the QNAP Web share
   \\192.168.108.5\Web with robocopy, print what changed, fail clearly if the share is
   unreachable. Do NOT use /MIR at the share root (it would delete other files there, e.g.
   the _antigo/ folder); copy/overwrite only the portal files. Note in README how to run it.
4. Local check: explain how to preview (e.g. `python -m http.server 8090` inside site/ and open
   http://localhost:8090/?mock). Describe the result at 375 px and wide.
5. Update docs/backlog/P001 Implementation Log and docs/backlog/index.md (status done),
   then commit. Do not push.
```

</details>

<details>
<summary>Implementation Log</summary>

<!-- aguardando execucao -->

</details>

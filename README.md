# grassiportal

Página inicial da casa Grassi no NAS (`grassinas`). Um portal simples — só HTML, CSS e
um pouco de JavaScript, sem build e sem backend próprio — com uma seção por aplicação da
casa. Hoje: **Patri** (um cartão por família) e **Administração** (atalhos).

- Endereço: `http://grassinas` (Tailscale) ou `http://192.168.108.5` (rede de casa).
- Quem acessa: só André e Anastasia (ACL do Tailscale libera a porta 80 só para eles).
- Não é parte do Patri. O Patri só oferece a rota pública `GET /api/portal/families`
  (feature F126 do Patri), com CORS liberado para a origem do portal.

## Estrutura

```
site/                 # tudo o que vai para o NAS (servido como está)
deploy/
  publish.ps1         # copia site/ para a pasta Web do NAS (criado na P001)
  docker-compose.yml  # alternativa (não usada): container nginx próprio na porta 80
docs/backlog/         # cópia exportada das issues (PORTAL-<n>-<Pxxx>-….md); a fonte é o GitHub Projects
```

## Publicar no NAS

O portal é servido pelo **Web Server do próprio QNAP** (porta 80), que serve a pasta
compartilhada **`Web`** do NAS. Sem container.

1. Uma vez: garantir que o Web Server está ligado (Painel de Controle → Aplicações → Web
   Server) e guardar o que existe hoje na pasta `Web` (página antiga) numa subpasta
   `_antigo/`, se quiser manter.
2. A cada mudança: copiar o conteúdo de `site/` para `\\grassinas\Web` (ou rodar
   `deploy/publish.ps1`). Vale na hora, não precisa reiniciar nada.

Para publicar: `powershell -ExecutionPolicy Bypass -File deploy\publish.ps1`. Copia só os
arquivos do portal (sem `/MIR`), então `_antigo/` e o resto da pasta `Web` ficam intactos.

## Pré-visualizar localmente

```
cd site
python -m http.server 8090
```

Abra `http://localhost:8090/?mock` (o `?mock` usa famílias de exemplo, sem precisar do Patri).

Alternativa guardada em `deploy/docker-compose.yml` (container nginx próprio), caso um dia
o Web Server do QNAP seja desligado.

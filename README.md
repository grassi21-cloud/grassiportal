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
  docker-compose.yml  # container nginx:alpine na porta 80, servindo a pasta do NAS
  publish.ps1         # copia site/ para o NAS (criado na P001)
docs/backlog/         # features (Pxxx), uma por arquivo, com spec + prompt do Claude Code
```

## Publicar no NAS

1. Uma vez: criar a pasta `/share/Container/grassiportal/site` no NAS, desligar o Web Server
   do QNAP (porta 80) e criar a aplicação `grassiportal` no Container Station colando
   `deploy/docker-compose.yml`.
2. A cada mudança: copiar o conteúdo de `site/` para `\\192.168.108.5\Container\grassiportal\site`
   (ou rodar `deploy/publish.ps1`). Não precisa recriar o container — o nginx serve os
   arquivos novos na hora.

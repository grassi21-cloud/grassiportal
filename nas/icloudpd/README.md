# icloudpd — backup das fotos do iCloud no NAS

Container `icloudpd-andre` (imagem oficial `icloudpd/icloudpd`, versão fixada no `compose.yml`)
que copia fotos, vídeos e Live Photos do iCloud do André para `Multimedia/iCloud/Andre`
(estrutura `AAAA/MM`), a cada 4 h. O QuMagie lê essa pasta. Issue #2.

## Pré-requisitos

- ADP (Proteção Avançada de Dados) desligada.
- "Acessar dados do iCloud na web" ligado (Ajustes → seu nome → iCloud).
- Conta Apple sem chave de segurança física (FIDO): o icloudpd não suporta.
- Espaço no NAS: o iCloud do André tem ~25 GB; conferir o livre em `Multimedia`.
- SSH do QNAP ligado só na rede de casa (Painel de Controle → Telnet/SSH).
- Senha de app do Gmail criada (https://myaccount.google.com/apppasswords) para o aviso por e-mail.

## Instalação

1. No File Station, criar a pasta `Multimedia/iCloud/Andre`.
2. Por SSH, criar a pasta da sessão e a pasta do compose:
   ```
   mkdir -p /share/Container/icloudpd/andre/cookies
   ```
3. Copiar `compose.yml` para `/share/Container/icloudpd/`.
4. Criar `/share/Container/icloudpd/.env` a partir de `.env.example`, com os valores reais.
   Esse arquivo fica **só no NAS**: nunca commitar, nunca colar em chat ou issue.
   ```
   chmod 600 /share/Container/icloudpd/.env
   ```
Antes de subir, fazer a validação e o teste pequeno abaixo.

### Validação no NAS (antes de subir)

Nada disto foi rodado fora do NAS (flags conferidos só no código-fonte da v1.32.3). Este é o
primeiro teste real:

```
cd /share/Container/icloudpd
docker compose config > /dev/null && echo "compose ok"
docker run --rm icloudpd/icloudpd:1.32.3 icloudpd --help
```

Não rodar `docker compose config` sem o `> /dev/null`, e não colar o resultado em lugar nenhum:
ele mostra a senha de app do `.env`. Conferir no `--help` que todos os flags do `compose.yml`
existem (`--directory`, `--cookie-directory`, `--username`, `--password-provider`,
`--mfa-provider`, `--size`, `--folder-structure`, `--set-exif-datetime`, `--watch-with-interval`,
`--smtp-username`, `--smtp-password`, `--smtp-host`, `--smtp-port`, `--notification-email`).
Se algum falhar, corrigir o `compose.yml` e fazer um commit pequeno.

### Teste pequeno (uma rodada, 50 itens)

Sem editar o `compose.yml`: o `command` é substituído só nesta execução, sem `--watch` e com
`--recent 50` (troque `SEU_APPLE_ID`; sem os flags de e-mail, só para o teste):

```
cd /share/Container/icloudpd
docker compose run --rm --service-ports icloudpd-andre icloudpd \
  --directory /data --cookie-directory /cookies --username SEU_APPLE_ID \
  --password-provider webui --mfa-provider webui --size original \
  --folder-structure "{:%Y/%m}" --set-exif-datetime --recent 50
```

Abrir http://192.168.108.5:8092 e autenticar (ver "Primeira autenticação"). Depois conferir:

1. Os arquivos caíram em `Multimedia/iCloud/Andre/AAAA/MM`.
2. Pelo Windows (`\\grassinas`), abrir um deles e apagar um (o dono é `root`, então confirmar
   que o SMB permite). Se não permitir, ajustar a permissão da pasta (ou `user:` no compose).
3. O QuMagie mostra os arquivos (depois de incluir `Multimedia/iCloud` nas fontes).

Só depois liberar o download completo, subindo o container sem `--recent`:

### Subir o container

```
cd /share/Container/icloudpd && docker compose up -d
```

O container aparece no Container Station.

Permissão de escrita: a imagem não define usuário, então o processo roda como `root` dentro do
container e grava em `/share/Multimedia/iCloud/Andre` sem ajuste. Os arquivos ficam com dono
`root`; o QuMagie e o SMB só leem, então não atrapalha. Se um dia o container passar a rodar com
outro usuário (`user:` no compose), dar permissão de escrita a ele nessa pasta e na de cookies.
Para testar: `ls -ln /share/Multimedia/iCloud/Andre` depois da primeira rodada.

## Primeira autenticação

1. Na rede de casa, abrir http://192.168.108.5:8092 (não há porta liberada no Tailscale nem na internet).
2. Digitar a senha da Apple e, quando pedir, o código 2FA que chega no iPhone.
3. Acompanhar: `docker logs -f icloudpd-andre`.

A senha da Apple **não é guardada**; só a sessão (cookies) em `/share/Container/icloudpd/andre/cookies`.
No modo contínuo (`--watch-with-interval`), a interface web continua no ar: quando a sessão expira,
o icloudpd envia o e-mail de aviso e a página volta a pedir o código.

## Biblioteca Compartilhada

Uma vez, para saber se o André usa (baixá-la está fora da issue #2). Pare o container antes
(`docker compose stop`) para não disputar a sessão e, depois do comando, `docker compose start`:

```
cd /share/Container/icloudpd
docker compose run --rm -it icloudpd-andre icloudpd --username "$ANDRE_APPLE_ID" \
  --cookie-directory /cookies --list-libraries --password-provider console --mfa-provider console
```

(`ANDRE_APPLE_ID` precisa estar exportado no shell, ou digite o Apple ID no lugar.)
Registrar o resultado num comentário da issue #2.

## Reautenticação

A Apple força novo 2FA a cada ~2 meses (não dá para evitar). Chega um e-mail de aviso:
abrir http://192.168.108.5:8092 e digitar o código (e a senha, se pedir).

O e-mail de aviso só será testado de verdade quando a sessão expirar (~2 meses). Se ele não
chegar e o iCloud parar de baixar, ver `docker logs icloudpd-andre` e abrir
http://192.168.108.5:8092.

Depois de reiniciar o NAS ou o container (`restart: unless-stopped` sobe sozinho): a sessão
salva costuma bastar; se `docker logs icloudpd-andre` mostrar pedido de senha/código, é o mesmo
procedimento pela página web.

## Conferir

- Rodada seguinte: `docker logs --tail 50 icloudpd-andre` deve mostrar "already exists" / nada novo.
- Contagem e tamanho:
  ```
  find /share/Multimedia/iCloud/Andre -type f | wc -l
  du -sh /share/Multimedia/iCloud/Andre
  ```
- Conferir 3 fotos antigas "otimizadas" no iPhone: devem existir em `AAAA/MM`.

## QuMagie

Fontes de conteúdo: só `Multimedia/Fotos`, `Multimedia/Camera Uploads`, `Multimedia/GoPro` e
`Multimedia/iCloud`. Remover `Videos`, `Dropbox` e as demais. Conferir que a linha do tempo
mostra as fotos de `iCloud/Andre`.

## Depois da primeira sincronização completa

Desligar o backup de fotos do app QuMagie no iPhone. `Camera Uploads` (destino antigo desse
backup) **não é mexida**: é arquivo histórico.

## Anastasia (depois, issue nova)

Copiar o bloco do serviço no `compose.yml` como `icloudpd-anastasia`: pasta
`/share/Multimedia/iCloud/Anastasia`, cookies em `cookies/anastasia`, outra porta do host
(ex.: 8093) e variável própria no `.env` (`ANASTASIA_APPLE_ID`).

## Segurança

- A sessão guardada equivale a acesso à conta Apple. Só é aceitável porque o NAS está fechado à
  internet (Patri#154): só rede de casa e Tailscale.
- A interface web (8092) só pela rede de casa; não abrir mais portas na ACL do Tailscale.
- Modo cópia: nada é apagado no iCloud, e nada local é apagado quando some do iCloud. Nunca usar
  `--auto-delete` nem `--keep-icloud-recent-days`.
- Segredos só no `.env` do NAS.

## Atualizar a versão

Trocar a tag da imagem no `compose.yml`, copiar para o NAS e:

```
cd /share/Container/icloudpd && docker compose pull && docker compose up -d
```

Só atualizar quando quiser, ou se a Apple mudar o login e a versão atual parar de funcionar.

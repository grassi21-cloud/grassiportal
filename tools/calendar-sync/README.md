# calendar-sync

Job que roda no NAS, lê o Google Agenda **Family** pelo endereço secreto iCal e grava
`calendar.json` em `/share/Web/data/` (servido em `http://grassinas/data/calendar.json`).
O portal lê esse arquivo com um `fetch()` simples (mesma origem, sem login do Google).

O arquivo tem informações privadas da família: só fica acessível na LAN/Tailscale, como o resto do portal.
A URL secreta **nunca** vai para o repositório, issues, logs ou chat.

## 1. Pegar o endereço secreto iCal
Google Agenda (no computador) → Configurações → **Family** → "Integrar agenda" →
**Endereço secreto no formato iCal**. Copie (não cole em lugar nenhum além do arquivo do passo 3).

## 2. Copiar os arquivos para o NAS
Copie o conteúdo de `tools/calendar-sync/` (`sync.py`, `Dockerfile`, `docker-compose.yml`,
`requirements.txt`) para a pasta do NAS:

- No NAS: `/share/Container/calendar-sync/`
- No Windows: `\grassinas\Container\calendar-sync\`

## 3. Criar o arquivo com a URL secreta (só no NAS)
Dentro dessa mesma pasta, crie `calendar-sync.env` com **uma linha**:

```
CALENDAR_ICAL_URL=<endereço secreto iCal>
```

(O modelo é `calendar-sync.env.example`, que só tem um placeholder.) Restrinja o acesso:
por SSH como admin,

```sh
chmod 600 /share/Container/calendar-sync/calendar-sync.env
```

ou, no File Station, Propriedades → Permissões: só o usuário admin, sem acesso para guest/everyone.

## 4. Preparar a pasta de saída
```sh
mkdir -p /share/Web/data
chmod 755 /share/Web/data
```
O job já grava `calendar.json` com permissão 644 e ajusta a pasta para 755, para o Web Server
do QNAP conseguir servir o arquivo.

## 5. Subir o job
**Por SSH** (mais simples). O `docker compose` precisa rodar **dentro de `/share/Container/calendar-sync`**,
pois é dali que o `env_file` (`calendar-sync.env`) e o `build: .` são resolvidos:

```sh
cd /share/Container/calendar-sync
docker compose up -d --build
docker compose logs -f
```

**Pelo Container Station:** Aplicativos → Criar → cole o conteúdo de `docker-compose.yml`, mas
troque `build: .` por uma imagem já construída (rode antes `docker build -t calendar-sync .` por SSH
nessa mesma pasta) e troque `env_file` por um caminho absoluto
(`/share/Container/calendar-sync/calendar-sync.env`). Se o Container Station não aceitar o
`env_file`, use o método por SSH.

O primeiro `calendar.json` aparece em até 1 minuto. Depois disso o job repete a cada 15 min
(`INTERVAL_MINUTES` no compose).

## Conferir
- `http://grassinas/data/calendar.json` abre um JSON (na LAN e no Tailscale).
- `docker compose logs` mostra `calendar.json atualizado: N eventos.`
- Se der "Permission denied"/403: `ls -l /share/Web/data` deve mostrar a pasta `drwxr-xr-x` e o arquivo `-rw-r--r--`.

## Se algo falhar
Em erro de rede ou de parse o job **mantém o JSON anterior** e loga o erro (sem a URL), tentando de novo no
próximo ciclo. Um feed sem nenhum evento nunca sobrescreve dados existentes.

## Teste offline
Sem rede e sem a URL real:

```sh
pip install -r requirements.txt
python -m unittest discover -s tests -v
```

## Deploy do portal
`deploy\publish.ps1` não toca em `Web\data\` (excluída explicitamente do robocopy).

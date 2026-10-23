---
status: backlog
created: 2026-10-23
title: "P002 · Backup das fotos do iCloud no NAS"
---

# P002 · Backup das fotos do iCloud no NAS

Ideia conversada com o André (2026-10). Spec de escopo — o prompt do Claude Code vem depois,
quando refinarmos.

## O que é

As fotos do iCloud do André e da Anastasia copiadas automaticamente para o NAS com o
**icloudpd** (iCloud Photos Downloader), **um container por pessoa**, cada um gravando na
própria pasta — por exemplo `Fotos/Andre` e `Fotos/Anastasia`.

O NAS passa a ter uma cópia completa e local das fotos da família, que o QuMagie pode
mostrar e que serve de base para os álbuns por viagem (P003).

## Por que

O backup pelo app QuMagie no celular conflita com a opção **"Otimizar armazenamento"** do
iPhone (as fotos originais ficam só no iCloud, então o app não tem o arquivo completo para
enviar). Baixar direto do iCloud resolve isso sem mudar a configuração dos iPhones.

## Decisões

- **icloudpd em container** no próprio QNAP (Container Station), um por pessoa, com pasta e
  sessão próprias — um não enxerga a conta do outro.
- **Pastas separadas por pessoa** dentro de uma pasta `Fotos` do NAS.
- **Só cópia** (download): o NAS não apaga nem altera nada no iCloud.
- **QuMagie aponta para essas pastas** para navegar/ver as fotos.

## Pontos de atenção

- **Login com 2FA uma vez**; a sessão expira mais ou menos **a cada 2 meses** e cada pessoa
  precisa se autenticar de novo (definir como o André/Anastasia ficam sabendo que expirou).
- **A sessão é uma sessão da conta Apple** — dado sensível. Só é aceitável com o **NAS fechado
  para a internet** (verificação da F129 do Patri). Sessão e configuração ficam fora de `site/`
  e fora do repositório.
- **Proteção Avançada de Dados (ADP)** bloqueia o icloudpd, a menos que o acesso pela web ao
  iCloud esteja habilitado na conta.

## Dependência

- **F129 do Patri** (NAS fechado para a internet) concluída e verificada antes de guardar
  sessões da Apple no NAS.

## Critérios de aceite

- Fotos (e vídeos) de cada pessoa aparecendo na pasta dela no NAS, incluindo as que estão só
  no iCloud por causa do "Otimizar armazenamento".
- Execuções seguintes baixam só o que é novo.
- Quando a sessão expira, fica claro quem precisa reautenticar e como.
- QuMagie mostra as fotos das duas pastas.

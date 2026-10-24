# vPlayCast

## O que é

vPlayCast é uma aplicação web para equipes paroquiais administrarem patrocinadores, telões, overlays compartilhados e relatórios de exibição. A aplicação usa Next.js App Router e Supabase (Auth, Postgres, Storage, RLS e RPCs).

## Valor central

Permitir que a equipe opere conteúdo de transmissão pela web, com autorização por igreja e páginas públicas seguras para telões, overlays e relatórios.

## Estado atual

Funcionalidades existentes e mantidas no projeto:

- Painel administrativo web protegido por Supabase Auth e pela propriedade de `churches.admin_id`.
- Cadastro e gestão de patrocinadores, mídia, configurações e telões NORMAL/MASTER.
- Telões públicos por igreja, contagem de exibições, sessão oficial e relatórios públicos.
- Biblioteca, editor e links públicos de overlays compartilháveis.
- Perfil público da igreja, comunidade, convite administrativo, recuperação de senha e Storage com RLS.

## Direção do projeto

O produto permanece uma aplicação web. Não haverá aplicativo Electron, instalador Windows, armazenamento local de overlays, servidor loopback, IPC ou migração que remova overlays do Supabase.

O trabalho futuro prioriza segurança, confiabilidade e documentação da arquitetura web existente.

Uma futura Grade TV administrativa também será web e somente para administradores. Ela apenas visualizará a agenda determinística que já alimenta o telão público; não criará um segundo algoritmo, novas sequências persistidas nem medição de exibições.

## Limites e decisões

| Decisão | Motivo |
| --- | --- |
| Administração permanece no site | É a interface operacional já implementada e protegida por Auth, proxy e RLS. |
| Overlays permanecem no Supabase | O editor e os links compartilhados dependem de dados, Storage e atualizações pela web. |
| Conteúdo público é separado por slug de igreja | Mantém URLs estáveis e evita misturar dados entre igrejas. |
| Autorização é garantida no banco | O cliente melhora a experiência, mas RLS e RPCs definem o acesso efetivo. |
| Mídia fica no bucket `v-playcast-midia` | Policies de Storage restringem operações por igreja. |

## Fora de escopo

- Electron, aplicativo desktop ou instalador Windows.
- Servidor de overlay em `127.0.0.1`, WebSocket local ou armazenamento de projetos no disco do operador.
- Remover a tabela, rotas ou links públicos de overlays.
- Sincronização de overlays entre um aplicativo local e Supabase.

---
*Atualizado em 2026-10-22 para refletir a arquitetura web atual.*

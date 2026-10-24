# O Que E o Projeto e Como Funciona

> Atualizado em 2026-10: as rotas públicas são sempre precedidas pelo slug da igreja, como `/{slug}/ads-telao` e `/{slug}/shared/{id}`.

## Ideia do Projeto

Telão Online é uma ferramenta operacional para organizar patrocinadores e elementos visuais usados em transmissão. A ideia é ter um painel simples para a equipe cadastrar mídias, controlar o que aparece no telão, acompanhar exibições e disponibilizar transparência pública para patrocinadores e parceiros.

O sistema nao e uma landing page. Ele e uma aplicacao de operacao: painel administrativo, telao publico, telao master, editor de overlays e relatorios.

## Publicos

- Operador: cadastra patrocinadores, ativa/desativa mídias, abre o telão e acompanha métricas.
- Equipe de transmissao: usa overlays em OBS ou ferramenta equivalente por meio de links publicos.
- Patrocinador: consulta pagina publica com historico e relatorio de exibicoes.
- Igrejas: vê o diretório público em `/igrejas` e acessa a página da igreja.

## Fluxo Principal

```mermaid
flowchart TD
  A[Admin faz login] --> B[Painel administrativo]
  B --> C[Cadastra patrocinadores]
  C --> D[Ativa NORMAL ou MASTER]
  D --> E[/{slug}/ads-telao exibe a playlist]
  E --> F[Player registra exibicoes quando contador esta ativo]
  F --> G[Relatorios publicos por patrocinador]
  B --> H[Cria overlays]
  H --> I[/{slug}/shared/:id usado na transmissao]
```

## Modulos Visiveis

- `/`: pagina publica com identidade da paroquia, preview do telao, cards de patrocinadores e estatisticas.
- `/login`: entrada administrativa.
- `/admin`: dashboard operacional.
- `/painel-telao`: cadastro, edicao, upload, ativacao e contador de patrocinadores.
- `/{slug}/ads-telao`: telao público da igreja.
- `/{slug}/parceiros/:id`: detalhe público de um patrocinador.
- `/overlay`: lista de overlays.
- `/editor/:id`: editor visual de overlay.
- `/{slug}/shared/:id`: overlay público para uso em transmissão.

## Contador de Exibicoes

O contador pode ser ligado no painel do telao. Ele respeita as telas NORMAL e MASTER separadamente:

- Exibições são registradas a partir do telão público `/{slug}/ads-telao`.
- Se um tipo nao possui patrocinador ativo, ele fica indisponivel para contagem.
- Se os dois tipos estiverem pausados ou sem patrocinadores ativos, o contador global desativa.
- O player guarda uma fila local de logs quando fica offline e tenta reenviar depois.

## Midias

Patrocinadores aceitam imagem, GIF, MP4 e WebM. Imagens comuns sao otimizadas antes do upload. Videos e GIFs podem aparecer como preview estatico em areas administrativas/publicas para evitar movimento excessivo, mas rodam no telao quando configurados como midia do patrocinador.

## Dados e Seguranca

O banco e Supabase Postgres. O app usa:

- Supabase Auth para login.
- `churches.admin_id` e RLS por igreja para autorizar o painel e cada dado.
- RLS para proteger escrita.
- RPCs `security definer` para consultas publicas controladas.
- Supabase Storage no bucket `v-playcast-midia`.
- Headers de seguranca no Next.
- Validacao de URLs publicas para aceitar apenas `http` e `https`.

## Cache e Atualizacao

As APIs publicas retornam `Cache-Control: no-store` para evitar dados velhos. O telao usa realtime do Supabase para reagir a mudancas no banco, e tambem mantem cache local para continuar exibindo a ultima playlist quando estiver offline.

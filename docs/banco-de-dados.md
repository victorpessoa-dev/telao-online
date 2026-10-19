# Banco de Dados

> Snapshot atual: `supabase/schema.sql`. Para bancos existentes, aplique as migrations; não execute o snapshot inteiro sobre um banco já criado.

## Tabelas

- `profiles`: perfil básico do usuário Supabase.
- `churches`: dados, slug, estado público (`is_active`) e o único administrador (`admin_id`).
- `sponsors`: patrocinadores, tipo, midia, status, duracao e metricas.
- `app_settings`: configuracoes JSON (`sponsor_settings`, `admin_settings`).
- `sponsor_impressions`: logs de exibicao.
- `sponsor_impression_daily_rollups`: totais diÃ¡rios compactos para grÃ¡ficos e relatÃ³rios.

## ER

```mermaid
erDiagram
  profiles {
    uuid id PK
    text display_name
    uuid admin_id
  }
  sponsors {
    uuid id PK
    sponsor_kind kind
    media_type media_type
    text media_url
    boolean active
    integer views
    integer total_seconds
  }
  overlays {
    uuid id PK
    text public_id UK
    jsonb data
    boolean is_public
  }
  app_settings {
    text key PK
    jsonb value
  }
  sponsor_impressions {
    uuid id PK
    uuid event_id UK
    uuid sponsor_id FK
    integer duration_seconds
    text source
  }
  sponsor_impression_daily_rollups {
    uuid sponsor_id FK
    date displayed_on
    integer views
    integer total_seconds
  }
  sponsors ||--o{ sponsor_impressions : receives
  sponsors ||--o{ sponsor_impression_daily_rollups : summarizes
```

## Enums

## Agenda global do telão

- `telao_schedules` mantém a semente determinística, versão e referência UTC compartilhadas pelo telão público.
- `official_display_sessions` identifica, por token efêmero e dispositivo, o único telão autorizado a registrar métricas.
- `sponsor_impressions.official_display_session_id` preserva a relação de cada registro com a sessão oficial.
- As RPCs `get_active_telao_schedule` e `open_official_display_session` são usadas, respectivamente, para sincronizar a reprodução e iniciar o telão oficial pelo painel administrativo.

- `sponsor_kind`: `NORMAL`, `MASTER`.
- `media_type`: `image`, `video`.

## Constraints e Indices

- Nome de patrocinador nao vazio.
- Duracao positiva.
- Midia obrigatoria e tipo `image`/`video`.
- Dimensoes de overlay positivas.
- Ãndices em status/tipo de patrocinador, public id, logs por data, `event_id` Ãºnico e resumos diÃ¡rios.

## RPCs Principais

- `get_public_sponsors`
- `get_sponsor_settings`
- `get_public_sponsor_directory`
- `get_public_sponsor_detail`
- `get_public_sponsor_report` (histÃ³rico paginado e sÃ©rie diÃ¡ria agregada)
- `get_public_overlay`
- `get_public_parish_profile`
- `log_sponsor_impressions`

## RLS

```mermaid
flowchart TD
  A[Request] --> B{Operacao}
  B -- Public read --> C[Sponsors ativos e configuracoes publicas]
  B -- Admin write --> D[public.owns_church]
  D --> E[churches.admin_id pelo auth.uid]
  B -- Profile read --> F[auth.uid = profiles.id]
```

## Settings

`sponsor_settings` guarda:

- `metricsEnabled`
- `metricsPaused.NORMAL`
- `metricsPaused.MASTER`
- designs por tipo `NORMAL` e `MASTER`

`admin_settings` guarda duracoes padrao e identidade publica da paroquia.

## Cuidados

- Manter `schema.sql` sincronizado com migrations.
- Revisar RPCs `security definer` ao alterar tabelas.
- Aplicar migrations novas antes do deploy.
- Para a instalaÃ§Ã£o atual, aplicar `supabase/upgrade-sponsor-reporting.sql` antes do deploy. Ela adiciona idempotÃªncia por `event_id`, reconstrÃ³i os resumos diÃ¡rios e cria a RPC paginada.
- Para bancos existentes, aplique `supabase/upgrade-all.sql` e depois `supabase/upgrade-global-telao-scheduling.sql` antes do deploy.
- O telão oficial depende da migration da agenda global; sem ela, a aplicação informa a dependência em vez de simular ciclos.

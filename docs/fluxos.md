# Fluxos da Aplicacao

> Atualizado em 2026-10: convite → confirmação de senha → configuração da própria igreja é o onboarding administrativo.

## Objetivo

Documentar inicializacao, autenticacao, estado, dados, eventos, erros, build e atualizacoes.

## Inicializacao

```mermaid
sequenceDiagram
  participant U as Usuario
  participant N as Next Layout
  participant S as StoreProvider
  participant SB as Supabase Browser
  participant DB as Supabase DB
  U->>N: Acessa rota
  N->>S: Monta provider global
  S->>SB: Cria client browser
  S->>DB: Busca overlays, sponsors, settings
  DB-->>S: Dados normalizados por mappers
  S-->>U: Pagina renderiza com estado global
```

## Login

```mermaid
flowchart TD
  A[Usuario acessa rota admin] --> B{proxy.js rota protegida?}
  B -- Nao --> C[NextResponse.next]
  B -- Sim --> D{env Supabase existe?}
  D -- Nao --> E[Redirect /login?error=missing_supabase_env]
  D -- Sim --> F[supabase.auth.getUser]
  F -- Sem usuario --> G[Redirect /login com redirectTo]
  F -- Usuário válido --> H{é dono de uma igreja?}
  H -- Sim --> I[Permite rota admin]
  H -- Nao --> J[Redirect /login?error=admin_required]
  K[Login page] --> L[signInWithPassword]
  L --> M[router.replace redirectTo]
```

## Player do Telao

```mermaid
flowchart TD
  A[TelaoPlayer] --> B[Consulta patrocinadores no Supabase]
  B --> C[Filtra dados públicos por igreja]
  C --> D[Filtra NORMAL ou MASTER]
  D --> E[Embaralha quando assinatura muda]
  E --> F[Preload e cache local]
  F --> G[Timer de exibicao]
  G --> H{metricas ligadas e tipo nao pausado?}
  H -- Sim --> I[POST /api/parceiros/logs]
  I --> J[RPC log_sponsor_impression]
  I -- Falha --> K[Fila localStorage]
  G --> L[Proximo patrocinador]
```

## Overlay Compartilhado

```mermaid
flowchart TD
  A[/{slug}/shared/:publicId] --> B[RPC get_public_overlay]
  B --> C[Renderiza elementos visiveis]
  C --> D[Realtime postgres_changes]
  C --> E[Polling 1s]
  D --> B
  E --> B
```

## Tratamento de Erros

```mermaid
flowchart TD
  A[Erro Supabase/API] --> B{Origem}
  B --> C[Component client: toast ou fallback visual]
  B --> D[API route: JSON com status 500/400/404]
  B --> E[Player: cache/fila offline]
  B --> F[Proxy: redirect login]
```

## Build

```mermaid
flowchart TD
  A[npm run build] --> B[next build]
  B --> C[Turbopack compile]
  C --> D[TypeScript validation enabled]
  D --> E[Generate static pages]
  E --> F[Route summary]
```

## Observacoes

- O provider global atende o admin e centraliza overlays, patrocinadores e settings.
- O player usa realtime, refresh periodico e cache local.
- Logs offline ficam em fila local e sao reenviados depois.

# Autenticacao, Seguranca, Logs e Operacao

> Atualizado em 2026-10: o acesso administrativo é definido pela propriedade da igreja, não por `profiles.is_admin`.

## Autenticacao e Acesso

O `proxy.js` protege rotas administrativas. O fluxo valida ambiente Supabase, usuário autenticado e uma igreja cujo `admin_id` seja o usuário atual.

```mermaid
flowchart TD
  A[Request admin] --> B{Supabase env existe?}
  B -- Nao --> C[/login?error=missing_supabase_env]
  B -- Sim --> D[auth.getUser]
  D -- Sem usuario --> E[/login]
  D -- Usuario --> F[churches.admin_id]
  F -- false --> G[/login?error=admin_required]
  F -- true --> H[Permite]
```

O admin tambem e bloqueado em modo mobile por UX e operacao.

## Autorizacao

A escrita nas tabelas sensíveis depende de RLS e `public.owns_church(church_id)`:

- `sponsors`
- `overlays`
- `app_settings`
- `telao_sessions`
- `sponsor_impressions`

Perfis podem ser lidos pelo proprio usuario, mas update de perfil e admin-only.

## Headers de Seguranca

Configurados em `next.config.mjs`:

- `X-Content-Type-Options: nosniff`
- `X-DNS-Prefetch-Control: off`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `Cross-Origin-Opener-Policy: same-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `Strict-Transport-Security`
- `Permissions-Policy`

## Links Publicos

URLs publicas externas sao filtradas para aceitar apenas `http` e `https`. Isso vale para redes sociais e links de patrocinadores.

## Rate limit e abuso

As rotas API usam `check_api_rate_limit`, uma RPC atômica que persiste somente
o hash da chave de limite. Por isso o limite funciona entre instâncias e não
armazena IP, token ou email em texto puro.

- leituras públicas continuam abertas e recebem limites amplos para preservar a disponibilidade;
- escrita administrativa, convite e sessão oficial possuem limites curtos e específicos;
- IP é um sinal de abuso, nunca autorização de acesso a conteúdo público;
- a tabela de rate limit não pode ser lida nem alterada pelo cliente.

## Logs e Contador

Logs de exibicao usam `/api/anunciantes/logs` e RPCs no banco. O payload é
validado com Zod e recebe rate limit distribuído por origem. A sessão oficial é
autorizada pelo token efêmero e pelo dispositivo que a reivindicou; IP não é
usado como requisito de acesso.

O contador:

- so registra quando `metricsEnabled` esta ativo;
- respeita pausa por `NORMAL` e `MASTER`;
- ignora fontes invalidas;
- limita duracao registrada;
- valida patrocinador ativo no banco.

## Upload

Upload valida:

- tamanho maximo;
- MIME permitido;
- nome sanitizado;
- otimizacao de imagens comuns;
- bucket de destino controlado por policies de storage.

## Operacao

- Aplicar migrations antes do deploy, incluindo `upgrade-api-security.sql`.
- Configurar CAPTCHA no Supabase Auth para login e recuperação de senha (Turnstile ou hCaptcha) e revisar os limites de Authentication > Rate Limits. O app não deve tentar substituir os limites próprios do provedor de autenticação.
- Garantir que cada igreja tenha exatamente um `admin_id` e que a conta seja criada por convite.
- Revisar RPCs `security definer` sempre que tabelas publicas mudarem.
- Fazer smoke test em `/`, `/login`, `/{slug}`, `/{slug}/ads-telao`, `/painel-telao` e `/overlay`.

# PASCOM Stream View

## What This Is

PASCOM Stream View será dividido entre um aplicativo Windows para toda a operação administrativa e um site Next.js público. O aplicativo permitirá gerir patrocinadores, ajustes, edições de telão, métricas e overlays locais; o site continuará atendendo somente landing page, páginas públicas por slug, comunidade, telões e relatórios públicos.

## Core Value

Permitir que a equipe da PASCOM opere uma transmissão com overlays locais que respondem instantaneamente no OBS, sem expor o painel administrativo ou os arquivos do computador à internet.

## Requirements

### Validated

- ✓ Site público com patrocinadores, telões NORMAL/MASTER e relatórios — código existente.
- ✓ Administração web de patrocinadores e editor de overlays com posicionamento — código existente.
- ✓ Supabase Auth, RLS, RPCs públicas e Storage — código existente.

### Active

- [ ] Criar aplicativo Electron distribuível para Windows.
- [ ] Mover a administração para o desktop autenticado.
- [ ] Substituir overlays no Supabase por projetos e assets locais.
- [ ] Servir overlays locais ao OBS e propagar alterações em tempo real.
- [ ] Remover overlays, editor e administração do site público.
- [ ] Remover com segurança os dados e contratos de overlay do Supabase.
- [ ] Atualizar documentação técnica, operacional e de migração.

### Out of Scope

- Publicar, sincronizar ou compartilhar overlays pela internet — overlays são estritamente locais.
- Aplicativo macOS/Linux — a primeira distribuição é Windows.
- MFA — o login administrativo usa somente e-mail e senha, por decisão do produto.
- Banco local de patrocinadores — patrocinadores, telões e relatórios continuam no Supabase.

## Context

O projeto atual é Next.js 16 com Supabase, e o domínio de overlays depende da tabela `public.overlays`, da RPC `get_public_overlay`, do Storage `pascom-media` e das rotas `/overlay`, `/editor/:id` e `/shared/:id`. O editor atual já possui elementos, posição, dimensões, camadas, redimensionamento e snapping; esses comportamentos serão reaproveitados no desktop, mas a fonte de verdade passará a ser o sistema de arquivos do Windows.

## Constraints

- **Segurança**: o executável nunca conterá `service_role`; toda operação online respeita Auth, RLS e `profiles.is_admin`.
- **Sessão**: haverá login por e-mail e senha e a opção “Manter conectado”; a senha não será salva, apenas a sessão criptografada pelo Windows.
- **Overlay local**: cada projeto terá UUID, pasta própria, assets próprios e link estável de loopback para o OBS.
- **Rede**: o servidor de overlays escutará exclusivamente em `127.0.0.1`; ele não será publicado na LAN nem na internet.
- **URLs**: URLs de overlay só usam `localhost`; URLs de telão, landing, comunidade e slugs de patrocinador usam o domínio web público; URLs externas cadastradas passam por validação `http/https`.
- **Migração**: dados e objetos de Storage de overlays só serão removidos após backup verificável e após o código deixar de depender deles.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Overlays são locais e não publicados | Evita exposição e mantém a operação independente da internet | — Pending |
| Electron para o desktop Windows | Permite sistema de arquivos, empacotamento e integração segura com OBS | — Pending |
| Link OBS por UUID e loopback | Link estável, sem depender de slug público | — Pending |
| Atualizações em tempo real por WebSocket | Mostrar/ocultar, edição e movimento devem aparecer sem recarregar o OBS | — Pending |
| Login somente e-mail/senha | Escopo solicitado; sessão persistida sem salvar senha | — Pending |
| Administração é desktop-only | Evita expor operações, métricas e edições no site público | — Pending |

---
*Last updated: 2026-10-18 after desktop/local-overlay planning*

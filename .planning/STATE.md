# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-10-18)

**Core value:** Overlays locais e reativos no OBS sem administração pública ou exposição de arquivos.
**Current focus:** Phase 1 — Desktop foundation and secure login (implemented locally; pending Windows smoke test and commit).

## Decisions locked for this milestone

- Overlays nunca são publicados nem sincronizados ao Supabase.
- O OBS acessa cada overlay via URL `127.0.0.1` e UUID local.
- Criação gera pasta por UUID; exclusão confirmada remove somente essa pasta.
- Atualizações do editor devem chegar imediatamente ao runtime aberto no OBS.
- Admin autentica somente com e-mail e senha; não haverá MFA.
- “Manter conectado” salva sessão criptografada, nunca a senha.
- A remoção do domínio de overlays no Supabase é autorizada somente após backup e migração de código.

## Next action

Validate the Electron flow on Windows: login, remembered-session restart, logout, first-run public-route validation and local overlay Browser Source. Then complete the public-overlay retirement and Supabase migration phases.

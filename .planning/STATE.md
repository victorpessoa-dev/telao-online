# Estado do projeto

## Referência

Veja `.planning/PROJECT.md` (atualizado em 2026-10-22).

**Valor central:** operação web segura de patrocinadores, telões, overlays e relatórios por igreja.

**Foco atual:** alinhar o plano de segurança à aplicação Next.js + Supabase existente.

## Decisões confirmadas

- Não haverá Electron, aplicativo desktop, instalador Windows, IPC ou `safeStorage`.
- Administração, editor de overlays e configurações continuam no painel web autenticado.
- Overlays continuam no Supabase e são exibidos por links públicos associados ao slug da igreja.
- Autorização é aplicada por Supabase Auth, `proxy.js`, RLS e RPCs; a UI não é a fronteira de segurança.
- O bucket `v-playcast-midia` continua sendo o repositório de mídia autorizado por policies de Storage.
- Qualquer migration deve preservar os fluxos atuais de patrocinadores, telões e overlays.

## Próxima ação

Executar a Fase 1: registrar o modelo de ameaças web e criar testes de autorização entre igrejas antes de mudar políticas, RPCs ou rotas.

## Trabalho futuro registrado

- A Fase 6 prevê uma Grade TV administrativa. A referência funcional está em `docs/atualizacao-futura-grade-tv.md`.
- A implementação deve reutilizar a agenda global em `lib/services/telao-schedule.js`; o telão público, a agenda e a versão de cronograma continuam sendo a fonte de verdade.

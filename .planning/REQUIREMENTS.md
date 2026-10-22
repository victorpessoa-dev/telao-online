# Requisitos: vPlayCast Web

**Definido:** 2026-10-22
**Valor central:** operar patrocinadores, telões e overlays pela web sem expor dados de uma igreja a outra.

## Requisitos validados no código atual

- **AUTH-01**: Administrador entra por e-mail e senha do Supabase e acessa o painel somente quando possui uma igreja em `churches.admin_id`.
- **AUTH-02**: `proxy.js` protege as rotas administrativas e o layout revalida a sessão no cliente.
- **ADM-01**: Painel gerencia patrocinadores, mídia, configurações, perfil da igreja e telões.
- **DISP-01**: Telões NORMAL e MASTER são públicos por slug, têm agenda/sessão oficial e podem registrar métricas.
- **OVR-01**: Overlays são criados e editados na web, persistidos no Supabase e publicados em links compartilháveis por igreja.
- **PUB-01**: Landing, comunidade, perfil público, patrocinadores e relatórios são disponíveis sem acesso ao painel.
- **DATA-01**: RLS, Storage policies e RPCs controlam acesso aos dados por igreja.
- **OPS-01**: O projeto possui testes, build, documentação de deploy, backup e smoke test.

## Requisitos de evolução

- [ ] **SEC-01**: Documentar o modelo de ameaças web, fronteiras de confiança e critérios de aceite para Auth, RLS, APIs, Storage, mídia e links públicos.
- [ ] **SEC-02**: Cobrir por testes automatizados acessos anônimo, autenticado sem igreja, administrador de outra igreja e administrador proprietário.
- [ ] **SEC-03**: Adotar uma Content Security Policy compatível com as origens usadas pelo app e testá-la em produção.
- [ ] **SEC-04**: Validar e limitar uploads, URLs, payloads de API e logs de exibição contra abuso e conteúdo não confiável.
- [ ] **REL-01**: Exercitar backup e restauração do Supabase e verificar migrations antes de cada deploy.
- [ ] **REL-02**: Monitorar falhas de APIs, Auth, RPCs e sessão oficial do telão sem registrar segredos ou dados pessoais desnecessários.
- [ ] **DOC-01**: Manter README e documentação técnica coerentes com a arquitetura web atual.
- [ ] **TVG-01**: Disponibilizar uma Grade TV exclusiva para administradores, baseada em `lib/services/telao-schedule.js`, que apresente oito ciclos por grupo, blocos proporcionais à duração e detalhes por hover/toque sem produzir métricas nem consultas adicionais por ciclo.

## Fora de escopo

| Item | Motivo |
| --- | --- |
| Electron e aplicativo Windows | O produto é operado no navegador. |
| Projetos de overlay locais e links loopback | Os overlays existentes são compartilhados pela web. |
| Exclusão de overlays do Supabase | Essa remoção quebraria editor, Storage e links públicos atuais. |

## Rastreabilidade

| Requisito | Fase |
| --- | --- |
| SEC-01, SEC-02 | 1 |
| SEC-03, SEC-04 | 2 |
| ADM-01, DISP-01, OVR-01, PUB-01, DATA-01 | 3 |
| REL-01, REL-02 | 4 |
| DOC-01 | 5 |
| TVG-01 | 6 |

---
*Atualizado em 2026-10-22.*

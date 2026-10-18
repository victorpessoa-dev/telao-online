# Requirements: PASCOM Stream View Desktop and Local Overlays

**Defined:** 2026-10-18
**Core Value:** Operar overlays locais, reativos e seguros no OBS sem expor a administração ou arquivos locais.

## v1 Requirements

### Desktop and authentication

- [ ] **DESK-01**: Administrador instala e abre um executável Windows assinado/empacotado.
- [ ] **AUTH-01**: Administrador entra no desktop usando e-mail e senha do Supabase e somente o proprietário de uma igreja (`churches.admin_id`) acessa a gestão.
- [ ] **AUTH-02**: A opção “Manter conectado” restaura uma sessão válida sem guardar a senha em texto ou arquivo comum.
- [ ] **AUTH-03**: Usuário pode sair, revogando a sessão local; sessão expirada ou inválida exige novo login.
- [ ] **AUTH-04**: O desktop usa isolamento de contexto, sandbox e APIs IPC estritamente permitidas.

### Local overlays

- [ ] **OVR-01**: Criar overlay gera UUID e pasta exclusiva com manifesto, assets e backups.
- [ ] **OVR-02**: Editor salva localmente nome, resolução, elementos, posições, tamanho, camadas, visibilidade e animações.
- [ ] **OVR-03**: A lista permite abrir editor, prévia, pasta local, duplicar, copiar o link OBS e excluir um projeto.
- [ ] **OVR-04**: A exclusão confirmada encerra o runtime do projeto, remove sua pasta e torna seu link indisponível.
- [ ] **OVR-05**: Alterações de mostrar/ocultar, texto, mídia, posição, tamanho, camada e animação aparecem no OBS sem recarregar a fonte.
- [ ] **OVR-06**: Alterações durante arraste têm prévia limitada a uma taxa segura; a posição final é persistida ao concluir a interação.

### Local OBS runtime

- [ ] **RUN-01**: O desktop inicia servidor HTTP/WebSocket limitado a `127.0.0.1`.
- [ ] **RUN-02**: Cada overlay possui link estável `http://127.0.0.1:<porta>/overlay/<uuid>` copiável para Browser Source do OBS.
- [ ] **RUN-03**: O runtime entrega fundo transparente, assets locais e estado inicial do overlay.
- [ ] **RUN-04**: Arquivos alterados externamente são validados, recarregados e notificados às fontes conectadas.

### Online administration and public web

- [ ] **ADM-01**: O executável permite gerir patrocinadores, telões e configurações online com as mesmas regras de autorização atuais.
- [ ] **ADM-02**: O executável concentra ajustes, edição de telões, métricas e todas as operações administrativas; o site não disponibiliza essas funções.
- [ ] **PUB-01**: O site público mantém `/`, `/telao`, `/telao-master` e relatórios de patrocinadores.
- [ ] **PUB-02**: O site hospedado não expõe login/admin, editor, lista, API nem links públicos de overlays.
- [ ] **PUB-03**: O site público oferece somente landing page, comunidade, páginas públicas por slug, telões web e relatórios de patrocinadores.
- [ ] **URL-01**: A interface oferece links de overlay somente em `127.0.0.1`, links de telão/landing/comunidade/slug no domínio público e valida URLs externas como `http` ou `https`.
- [ ] **URL-02**: No primeiro acesso do desktop, administrador escolhe tema e domínio público; o aplicativo valida `/{slug}/ads-telao` antes de confirmar a configuração.

### Supabase migration and documentation

- [ ] **DB-01**: Exportação verificável preserva linhas e objetos de overlay antes da remoção.
- [ ] **DB-02**: Migration remove `overlays`, políticas, índices e RPCs exclusivos de overlay sem afetar patrocinadores ou Storage deles.
- [ ] **DB-03**: Objetos de Storage exclusivos de overlay são removidos somente depois do backup e de auditoria por prefixo.
- [ ] **DOC-01**: README, arquitetura, banco, APIs, segurança, deploy e guia do usuário/desenvolvedor refletem o novo limite desktop/público.
- [ ] **DOC-02**: Existe runbook de instalação, login, backup/restauração local e configuração do OBS.

## Out of Scope

| Feature | Reason |
| --- | --- |
| URLs públicas de overlay | Contraria a decisão de execução somente local. |
| Sincronização entre computadores | Exige conflitos, identidade de dispositivos e novo modelo de produto. |
| MFA | Explicitamente excluído nesta versão. |
| Acesso remoto ao servidor local | Aumenta superfície de ataque e não é necessário para OBS local. |

## Traceability

| Requirement | Phase | Status |
| --- | --- | --- |
| DESK-01, AUTH-01..04 | 1 | Pending |
| OVR-01..04 | 2 | Pending |
| OVR-05..06, RUN-01..04 | 3 | Pending |
| ADM-01..02 | 4 | Pending |
| PUB-01..03, URL-01, DB-01..03 | 5 | Pending |
| DOC-01..02 | 6 | Pending |

---
*Requirements defined: 2026-10-18*

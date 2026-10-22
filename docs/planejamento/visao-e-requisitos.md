# Visão e requisitos do vPlayCast

## Produto

O vPlayCast é uma aplicação web para equipes paroquiais administrarem patrocinadores, telões, overlays compartilhados e relatórios de exibição. A arquitetura usa Next.js App Router e Supabase para autenticação, banco PostgreSQL, Storage, RLS e RPCs.

O valor central é permitir a operação web de conteúdo de transmissão por igreja, sem misturar dados administrativos entre igrejas e mantendo URLs públicas seguras para telões, overlays e relatórios.

## Escopo atual

- Painel administrativo protegido por Supabase Auth e pela propriedade de `churches.admin_id`.
- Cadastro e edição de patrocinadores, mídia, configurações da igreja e modos NORMAL e MASTER.
- Telão público por slug da igreja, agenda determinística, sessão oficial de exibição e relatórios públicos.
- Contagem oficial aberta pelo administrador em uma nova aba; as impressões concluídas são enviadas em lote, em intervalo de 90 segundos, e também são descarregadas antes de desativar a contagem.
- Grade TV administrativa em `/grade-ads`, alimentada pela mesma agenda do telão público.
- Biblioteca, editor e links públicos de overlays compartilháveis.
- Perfil público da igreja, comunidade, convite administrativo, recuperação de senha e mídia protegida por policies de Storage.

## Decisões mantidas

| Decisão | Motivo |
| --- | --- |
| O produto permanece web | O painel, os telões e os overlays dependem de URLs, autenticação e dados centralizados. |
| Não haverá Electron, aplicativo desktop ou instalador Windows | Não há runtime local, IPC, servidor loopback ou arquivos de projeto de overlay no computador do operador. |
| Overlays permanecem no Supabase | O editor e os links compartilhados dependem de dados, Storage e atualização pela web. |
| A autorização efetiva é aplicada no banco | A interface e o `proxy.js` ajudam a navegação, mas RLS e RPCs são a fronteira de acesso aos dados. |
| O bucket atual de mídia é `v-playcast-midia` | A migração para Cloudflare R2 é futura e está descrita em documentos próprios. |
| A Grade TV não mede exibições | Ela é uma visualização administrativa da agenda oficial, não um segundo telão. |

## Requisitos validados no produto

- **AUTH-01:** um administrador entra com e-mail e senha do Supabase e acessa o painel somente quando possui uma igreja em `churches.admin_id`.
- **AUTH-02:** o `proxy.js` protege as rotas administrativas e o layout revalida a sessão no cliente.
- **ADM-01:** o painel gerencia patrocinadores, mídia, configurações, perfil da igreja e telões.
- **DISP-01:** telões NORMAL e MASTER são públicos por slug, usam agenda/sessão oficial e podem registrar métricas.
- **OVR-01:** overlays são criados e editados na web, persistidos no Supabase e publicados em links compartilháveis por igreja.
- **PUB-01:** landing, comunidade, perfil público, patrocinadores e relatórios não exigem acesso ao painel.
- **DATA-01:** RLS, policies de Storage e RPCs controlam o acesso aos dados por igreja.
- **OPS-01:** o repositório contém testes, build, documentação de deploy, backup e smoke test.
- **TVG-01:** a Grade TV administrativa reutiliza `lib/services/telao-schedule.js`, mostra 11 ciclos (cinco anteriores, o atual e cinco próximos) e não gera métricas.

## Evoluções em aberto

- **SEC-01:** documentar modelo de ameaças, fronteiras de confiança e critérios de aceite para Auth, RLS, APIs, Storage, mídia e links públicos.
- **SEC-02:** automatizar testes de acesso anônimo, sem igreja, entre igrejas e do administrador proprietário.
- **SEC-03:** adotar e validar uma Content Security Policy compatível com as origens do aplicativo.
- **SEC-04:** padronizar validação e limites para uploads, URLs, payloads e logs de exibição.
- **REL-01:** exercitar backup/restauração e revisar os scripts SQL antes de cada deploy.
- **REL-02:** monitorar falhas de APIs, Auth, RPCs e sessão oficial sem registrar segredos ou dados pessoais desnecessários.
- **DOC-01:** manter a documentação alinhada à arquitetura web atual e às mudanças de operação.

## Fora de escopo

- Electron, aplicativo desktop, instalador Windows ou execução local de telão/overlay.
- Servidor em `127.0.0.1`, WebSocket local, IPC ou armazenamento de projetos no disco do operador.
- Remover overlays, tabelas ou links públicos que ainda são usados pelo aplicativo web.
- Migrar mídia para R2 antes de concluir os pré-requisitos e as etapas descritas nos planos de Cloudflare R2.

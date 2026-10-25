# Visão e requisitos do Telão Online

## Produto

Telão Online é uma aplicação web para igrejas organizarem patrocinadores, exibirem mídias em telões e acompanharem os resultados das exibições. O sistema usa Next.js e Supabase para autenticação, banco, armazenamento e regras de acesso.

## Escopo atual

- Painel administrativo por igreja, protegido por autenticação e por `churches.admin_id`.
- Cadastro, edição, mídia, ativação e configuração de patrocinadores.
- Telões públicos NORMAL e MASTER por slug da igreja.
- Agenda determinística, sessão oficial e métricas de exibição.
- Perfil público da igreja, diretório em `/igrejas`, páginas de parceiros e relatórios.
- Formulário de interesse para novos patrocinadores.

## Decisões vigentes

| Decisão | Motivo |
| --- | --- |
| O produto permanece web | Painel, conteúdo público e telões dependem de URLs e dados centralizados. |
| Não haverá aplicativo desktop | A operação é feita no navegador, sem runtime local ou IPC. |
| A autorização efetiva fica no banco | RLS e RPCs são a fronteira de acesso aos dados de cada igreja. |
| O bucket atual é `telao-online-midia` | Cloudflare R2 será tratado em uma atualização futura planejada. |
| A Grade TV não mede exibições | Ela é uma visualização administrativa da agenda oficial. |

## Requisitos do produto

- **AUTH-01:** o administrador acessa o painel apenas quando é proprietário de uma igreja.
- **ADM-01:** a equipe gerencia patrocinadores, mídia, perfil da igreja, configurações e telões.
- **DISP-01:** telões NORMAL e MASTER são públicos por slug e podem registrar métricas.
- **PUB-01:** raiz, `/igrejas`, perfil público, parceiros e relatórios não exigem login.
- **DATA-01:** RLS, policies de Storage e RPCs mantêm os dados separados por igreja.
- **OPS-01:** o repositório mantém testes, documentação de deploy, backup e smoke test.

## Próximas evoluções

- Validar backup e restauração periodicamente.
- Automatizar cenários de acesso entre igrejas.
- Evoluir a observabilidade de APIs, autenticação e sessões oficiais.
- Executar a migração para Cloudflare R2 quando seus pré-requisitos forem concluídos.

## Fora de escopo

- Aplicativo desktop, instalador Windows ou servidor local.
- Operação por `127.0.0.1`, WebSocket local ou IPC.
- Migração de mídia para R2 antes das etapas definidas nos planos do projeto.

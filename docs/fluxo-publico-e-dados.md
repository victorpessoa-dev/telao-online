# Fluxo público e requisições ao banco

Este documento descreve como as páginas públicas obtêm dados do Supabase, quais filtros protegem os dados e como as requisições são reduzidas para suportar muitos acessos.

## Princípios

- Apenas igrejas com `is_active = true` aparecem ou respondem nas rotas públicas.
- Apenas patrocinadores ativos da igreja solicitada são expostos.
- A camada pública usa RPCs `security definer` com filtros explícitos; não entrega tabelas inteiras ao navegador.
- Leituras públicas com baixa frequência usam cache HTTP. Escritas de métricas usam fila local e lote.
- A planilha de exibições nunca baixa o histórico inteiro: recebe somente a página escolhida e os totais diários já agregados.

## Visão geral

```mermaid
flowchart LR
  Browser[Navegador público] -->|GET| Next[Rotas API do Next]
  Browser -->|RPC público| Supabase[Supabase]
  Next -->|RPC/tabela autorizada| Supabase
  Supabase --> RPCs[RPCs com filtros de igreja ativa]
  RPCs --> DB[(Postgres)]

  Telao[Telão] -->|fila local + lote| LogsAPI[/api/parceiros/logs]
  LogsAPI --> LogRPC[log_sponsor_impressions]
  LogRPC --> DB
```

## Rotas e consultas

| Página/ação pública | Requisição do navegador | Consulta no banco | Cache / limite |
|---|---|---|---|
| `/igrejas` | `GET /api/igrejas` | `get_public_churches()` | cache do navegador 60 s; CDN até 5 min, com conteúdo antigo por até 10 min durante revalidação |
| `/{slug}` | `GET /api/igreja/{slug}` | `get_public_church_by_slug(slug)` | mesma política pública de cache |
| `/{slug}` — patrocinadores | RPC do navegador | `get_public_sponsor_directory(church_id)` | retorna somente patrocinadores ativos da igreja |
| `/{slug}` — visita | `POST /api/igreja/{slug}/visita` | `record_public_church_visit(slug)` | no máximo uma contagem por IP/slug a cada 30 min |
| `/{slug}/ads-telao` | primeiro obtém a igreja; depois `GET /api/telao/{slug}` | `get_public_church_by_slug` e `get_public_telao_payload(slug)` | resposta do telão: browser 60 s, CDN 5 min, stale-while-revalidate de 1 h |
| `/{slug}/parceiros/{id}` | primeiro obtém a igreja; depois `GET /api/parceiros/{id}?churchId=…&page=…&pageSize=20` | validação de vínculo, `get_public_sponsor_detail` e `get_public_sponsor_report` | detalhe: browser 30 s, CDN 2 min, stale-while-revalidate 5 min |
| exibição no telão | `POST /api/parceiros/logs` | `log_sponsor_impressions(logs_arg)` | fila local; lotes de até 100 eventos, a cada 2 min |

## Igrejas: `/igrejas`

`app/(public)/igrejas/page.jsx` chama `fetchPublicChurches()`. A raiz (`/`) abre o único slug ativo ou redireciona para esta lista quando há zero ou mais de uma igreja ativa. O serviço faz uma chamada a `/api/igrejas`, que chama a RPC `get_public_churches()`.

Essa RPC seleciona somente `id`, nome, slug, cidade, logo e capa de igrejas ativas. A busca digitada pelo visitante ocorre em memória, sobre a lista já recebida; não cria novas consultas ao banco.

## Perfil público da igreja: `/{slug}`

`components/public/church-public-page.jsx` faz duas leituras iniciais:

1. `GET /api/igreja/{slug}` obtém o perfil público da igreja pela RPC `get_public_church_by_slug`.
2. Com o `church.id` recebido, o navegador chama `get_public_sponsor_directory(church_id)` para montar os cards e os indicadores de patrocínio.

Em paralelo, sem bloquear a tela, a página tenta registrar uma visita. A rota de visita aplica rate limit de uma contagem por IP e slug a cada 30 minutos. Se falhar, a página continua funcional.

## Telão público: `/{slug}/ads-telao`

O `ChurchGate` resolve o slug uma vez. Em seguida, `TelaoPlayer` chama `/api/telao/{slug}`, que busca uma única carga com:

- identificação da igreja;
- patrocinadores ativos e suas mídias;
- configurações públicas de duração do telão.

O navegador armazena essa carga em `localStorage`, segmentada por igreja e tipo de telão. Se estiver offline, usa a última carga válida.

Após carregar, o telão usa duas estratégias de atualização:

- assinatura Realtime nas tabelas `sponsors` e `app_settings`, para refletir mudanças logo após uma edição;
- consulta de segurança a cada 5 minutos, apenas quando há conexão.

Isso evita consultar o banco a cada troca de anúncio.

## Métricas de exibição

Cada troca de mídia cria localmente um evento com:

```json
{
  "eventId": "uuid-único",
  "sponsorId": "uuid-do-patrocinador",
  "displayedAt": "data ISO",
  "durationSeconds": 10,
  "source": "telao"
}
```

O evento vai para uma fila no `localStorage`, separada por igreja e tipo de telão. A fila é enviada quando:

- passam 2 minutos;
- o dispositivo volta a ficar online;
- o telão é aberto;
- a página é encerrada, quando o navegador permite concluir a chamada.

Cada POST aceita até 100 eventos e resulta em uma RPC única. Se a rede falhar, os eventos continuam na fila para nova tentativa.

### Idempotência e agregação

`event_id` é único em `sponsor_impressions`. A RPC `log_sponsor_impressions` usa `ON CONFLICT DO NOTHING`; portanto, reenviar o mesmo lote não duplica visualizações nem segundos.

Para cada evento novo, a mesma transação atualiza:

- `sponsors.views`, `sponsors.total_seconds` e `sponsors.last_displayed_at`;
- o evento bruto em `sponsor_impressions`, para auditoria;
- o resumo de dia em `sponsor_impression_daily_rollups`, usado em gráficos e totais.

## Detalhe e planilha do patrocinador: `/{slug}/parceiros/{id}`

A página solicita explicitamente a página atual:

```text
/api/parceiros/{id}?churchId={uuid}&page=1&pageSize=20
```

A API valida `id`, `churchId`, página e tamanho (máximo 100), verifica se o patrocinador pertence à igreja e carrega em paralelo:

- dados do patrocinador (`get_public_sponsor_detail`);
- relatório (`get_public_sponsor_report`).

O relatório retorna um JSON com:

- `logs`: somente as 20 linhas da página solicitada, ordenadas pela exibição mais recente;
- `daily`: totais diários de exibições e segundos, vindos da tabela de agregados;
- `totalItems`: contador já existente em `sponsors.views`, sem executar `COUNT(*)` no histórico bruto;
- `page` e `pageSize`.

Ao clicar na paginação, a página chama a API novamente apenas para os próximos 20 registros. Gráficos usam `daily`; por isso não crescem com a quantidade de logs brutos.

## Segurança e exposição de dados

- As RPCs públicas verificam igreja ativa e patrocinador ativo internamente.
- A rota de detalhe recebe o `churchId` e confirma o vínculo do patrocinador antes de responder.
- Os endpoints públicos não usam dados administrativos, dados de login ou links internos de Storage.
- O endpoint de logs limita requisições por IP e valida payload com Zod: até 100 itens, UUID de patrocinador/evento, duração entre 0 e 3600 segundos e origem curta.

## Cache HTTP atual

| Tipo de resposta | Browser | CDN/proxy | Conteúdo antigo enquanto revalida |
|---|---:|---:|---:|
| lista/perfil público | 60 s | 5 min | 10 min |
| detalhe do patrocinador | 30 s | 2 min | 5 min |
| carga do telão | 60 s | 5 min | 1 h |
| visitas e logs | sem cache | sem cache | não se aplica |

## Operação e evolução

- Para banco já existente, aplicar `supabase/upgrade-sponsor-reporting.sql` antes do deploy da aplicação.
- Para um banco novo, `supabase/schema.sql` já contém tabelas, índices e RPCs atualizados.
- Eventos brutos podem receber uma política futura de retenção/arquivo (por exemplo, 90 dias), mantendo os resumos diários por prazo maior.
- Métricas recomendadas para monitoramento: tamanho/idade da fila local, lotes enviados, falhas de envio, eventos duplicados ignorados e tempo de execução da RPC.

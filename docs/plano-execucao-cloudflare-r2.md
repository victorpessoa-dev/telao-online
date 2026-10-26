# Plano de execução futura: adaptar o Telão Online ao Cloudflare R2

Este documento converte o plano de infraestrutura em trabalho executavel no codigo atual. Nao inicia a migracao: define a ordem segura para que o projeto passe a receber e servir midias pelo Cloudflare R2.

## Resultado esperado

Depois da entrega, imagens e videos de patrocinadores, logo/capa da igreja e fundos de patrocinio sao enviados diretamente do navegador ao R2 por URL temporaria. O Supabase mantem somente os dados e as referencias das midias. Telas publicas usam URLs do dominio `media` do Cloudflare, com cache longo.

O fluxo atual nao pode ser interrompido: uma URL antiga do Supabase Storage continua valida durante toda a migracao.

## Decisoes tecnicas

| Tema | Decisao |
| --- | --- |
| Acesso ao R2 | API S3 compativel, por `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` somente no servidor |
| Envio de arquivo | navegador envia diretamente ao R2 via `PUT` pre-assinado |
| Autorizacao | rota Next valida sessao Supabase e igreja antes de assinar cada upload |
| Referencia no banco | manter as colunas de URL; adicionar metadados de objeto para novas midias |
| Entrega publica | `https://media.<dominio>/...`, bucket publico apenas por dominio personalizado |
| Cache | chave imutavel por UUID e `Cache-Control: public, max-age=31536000, immutable` |
| Classe R2 | somente **Standard** |
| Compatibilidade | URLs atuais do Supabase continuam sendo lidas e excluidas pelo adaptador legado |

## Arquivos que serao alterados

| Area | Arquivos atuais | Mudanca planejada |
| --- | --- | --- |
| Configuracao | `.env.example`, `docs/configuracao-de-ambiente.md` | adicionar credenciais R2 somente de servidor e URL publica da midia |
| Cliente R2 | novo `lib/media/r2-server.js` | criar cliente S3, gerar chave, URL publica, URL temporaria e exclusao |
| Validacao de midia | `services/supabase/upload.js` | preservar otimizacao/crop/FFmpeg no navegador; substituir upload e exclusao por adaptador R2 + legado Supabase |
| API autenticada | novo `app/api/media/upload-url/route.js` | emitir URL temporaria de upload apos validar usuario, igreja, finalidade, MIME e tamanho |
| Interface | `components/sponsors/ad-manager.js`, `app/(admin)/configuracoes/page.jsx`, `app/(admin)/configurar-igreja/page.jsx` | usar a nova funcao de upload sem alterar o dialogo, crop, preview ou fluxo de salvar |
| Banco | nova migration em `supabase/migrations/` e `supabase/schema.sql` | registrar origem/chave R2 de forma compativel e manter URLs existentes |
| Remocao | `lib/store/store.js` e pontos de troca de media | apagar objeto R2 somente depois da atualizacao no banco dar certo |
| Testes | testes de unidade/rotas novos | cobrir permissao, validacao, chaves, upload, fallback e exclusao |

## Etapa 0 — pre-requisitos externos

Responsabilidade manual, antes do codigo:

1. Criar bucket Standard `telao-online-media`.
2. Conectar `media.<dominio>` ao bucket na mesma conta/zone Cloudflare.
3. Desativar acesso publico `r2.dev` em producao.
4. Criar token R2 restrito ao bucket, sem permissao administrativa de conta.
5. Configurar CORS para o dominio de producao e `http://localhost:3000`.
6. Criar regra de lifecycle que remove `staging/` apos 24 horas.
7. Ativar alertas de custo em US$ 0,01 e US$ 1,00.

O dominio personalizado e obrigatorio para producao. `r2.dev` fica somente para homologacao; ele nao oferece as mesmas capacidades de cache e seguranca do dominio proprio.

## Etapa 1 — contrato de configuracao e cliente de servidor

Adicionar, sem prefixo `NEXT_PUBLIC_`, as chaves abaixo:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=telao-online-media
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.seudominio.com.br
```

Implementar `lib/media/r2-server.js` com funcoes pequenas e testaveis:

- `createMediaObjectKey({ churchId, scope, extension })`;
- `createR2UploadUrl({ key, contentType, contentLength })`;
- `getPublicMediaUrl(key)`;
- `deleteR2Object(key)`;
- `isR2MediaUrl(url)` e `getR2KeyFromUrl(url)`.

Chaves previstas:

```text
churches/{churchId}/sponsors/{uuid}.webp
churches/{churchId}/sponsors/{uuid}.mp4
churches/{churchId}/branding/{uuid}.webp
churches/{churchId}/backgrounds/{uuid}.webp
staging/{churchId}/{uuid}
```

Nao aceitar `churchId`, bucket ou caminho livre do cliente como autoridade. A igreja vem da sessao autenticada e a finalidade vem de uma lista fechada: `sponsors`, `branding` e `backgrounds`.

## Etapa 2 — endpoint de URL temporaria

Criar `POST /api/media/upload-url`.

Entrada validada por Zod:

```json
{
  "scope": "sponsors",
  "contentType": "image/webp",
  "contentLength": 123456,
  "extension": "webp"
}
```

Comportamento:

1. Limitar chamadas por IP e usuario para evitar abuso de assinaturas.
2. Recuperar usuario com `createSupabaseServerClient()`.
3. Consultar a igreja cujo `admin_id` pertence ao usuario. Nunca confiar em identificador enviado pelo navegador.
4. Validar tipo permitido e limite de 100 MB; para video manter tambem o limite funcional atual de 20 segundos apos otimizacao.
5. Criar chave UUID e URL `PUT` com expiração curta, de cinco minutos.
6. Retornar somente `uploadUrl`, `publicUrl`, `key` e headers obrigatorios.

O endpoint usa `NO_STORE_HEADERS`, nunca registra segredos em log e retorna mensagens genericas em falhas de credencial. O PUT ocorre navegador -> R2, sem trafegar video pelo servidor Next.js.

## Etapa 3 — adaptar o upload existente

O arquivo `services/supabase/upload.js` ja concentra validacao, compressao de imagem, crop e processamento de video. Preservar essas partes e trocar somente a camada de persistencia:

1. `prepareMediaForUpload()` permanece como esta.
2. `uploadMedia()` chama `/api/media/upload-url`, faz `fetch(uploadUrl, { method: "PUT" })` e retorna uma referencia R2 estruturada.
3. Introduzir `deleteMedia(reference)` que identifica R2 ou Supabase legado. Objetos R2 sao removidos por uma rota autenticada de servidor, nunca com segredo no cliente.
4. Manter temporariamente `deleteUploadedMedia()` como fachada compativel para os chamadores atuais e migrar os nomes numa alteracao posterior de baixo risco.
5. Se a gravacao do patrocinador/igreja falhar depois do envio, solicitar limpeza do objeto novo; se a limpeza falhar, o lifecycle de `staging` deve recuperar o arquivo.

Para evitar objetos publicados sem referencia, a primeira versao deve enviar para `staging/`. Depois que o banco confirmar a URL, uma rota autenticada promove/copía o objeto para a chave definitiva. A operacao e pouco frequente e fica muito abaixo da cota gratuita de Classe A.

## Etapa 4 — modelo de dados e compatibilidade

Criar migration aditiva, sem remover `media_url`, `image_url`, `logo_url`, `cover_url` nem o JSON de design existente.

Proposta minima:

- tabela `media_assets`: `id`, `church_id`, `object_key`, `public_url`, `provider` (`r2` ou `supabase`), `content_type`, `size_bytes`, `purpose`, `created_at`, `deleted_at`;
- `sponsors.media_asset_id` opcional;
- nos campos `churches.logo_url`, `churches.cover_url` e fundos em `app_settings`, manter URL publica e registrar o objeto correspondente em `media_assets`.

Essa tabela permite excluir corretamente objetos R2 sem tentar deduzir uma chave por URL, fazer auditoria de armazenamento e migrar gradualmente. Enquanto `media_asset_id` estiver nulo, os mappers continuam usando `media_url`, `image_url`, `logo_url` ou `cover_url` atuais.

Atualizar `lib/repositories/sponsors.js`, `lib/mappers/sponsors.js` e as RPCs de `supabase/schema.sql` para retornarem a URL publica de maneira identica ao contrato atual. O player, a Grade TV e telas publicas nao devem precisar saber se a midia veio do R2 ou do Supabase.

## Etapa 5 — integrar cada ponto de upload

Em ordem de menor risco:

1. Fundo de patrocinio em `app/(admin)/configuracoes/page.jsx`.
2. Logo e capa na configuracao/primeiro acesso da igreja.
3. Criar patrocinador em `components/sponsors/ad-manager.js`.
4. Editar patrocinador e substituir midia.
5. Excluir um patrocinador, igreja ou imagem substituida.

Para cada ponto, testar cancelamento, erro de rede, upload invalido, troca consecutiva, refresh do navegador e exclusao. O painel so mostra sucesso apos o banco guardar a referencia; o preview local continua funcionando antes disso.

## Etapa 6 — migracao de conteudo ja existente

1. Adicionar suporte R2 e publicar sem mover arquivo algum.
2. Criar script administrativo idempotente que lista somente URLs do bucket `telao-online-midia`, baixa o objeto, confere tipo/tamanho, envia ao R2 e cria/atualiza o `media_assets`.
3. Executar primeiro para uma igreja de teste e conferir telão NORMAL, MASTER, Grade TV, pagina publica, logo e capa.
4. Migrar por igreja e gerar relatorio de sucesso, falha e URL antiga/nova.
5. Manter as origens no Supabase por sete dias. Somente entao remover objetos que tenham referencia R2 confirmada.

Nao migrar links externos: permanecem externos e nao devem ser copiados sem autorizacao.

## Etapa 7 — testes, deploy e rollback

### Testes obrigatorios

- unidade: construcao de chave, restricao de `scope`, MIME, tamanho, URL publica e deteccao legado/R2;
- rota: sem sessao (401), sem igreja (403/404), payload invalido (400), sucesso e rate limit (429);
- interface: upload de imagem recortada, video processado, falha de PUT e tentativa de salvar;
- E2E manual: criar, editar e excluir patrocinador; alterar logo/capa/fundo; carregar telão NORMAL, MASTER e Grade TV;
- seguranca: conta A nao obtém URL de upload para a igreja B, segredo R2 ausente do bundle do navegador e `r2.dev` inacessivel em producao.

### Ordem de deploy

1. Criar bucket/segredos e migration.
2. Publicar API e adaptador com fallback Supabase.
3. Habilitar novo upload somente em homologacao.
4. Validar uma igreja real.
5. Habilitar producao e iniciar migracao em lotes.

### Rollback

Um feature flag de servidor `MEDIA_PROVIDER=supabase|r2` permite retornar uploads novos para Supabase sem afetar referencias R2 ja gravadas. O leitor sempre aceita ambos. Nao apagar qualquer midia de origem antes dos sete dias de verificacao.

## Criterios de conclusao

- Nenhuma chave R2 aparece no cliente, Git, logs ou resposta publica.
- Arquivos novos sao recebidos pelo R2 e entregues por `media.<dominio>`.
- O Supabase continua contendo apenas dados e referencias; o telão nao perde midias antigas.
- Todos os caminhos de criar/editar/excluir limpam arquivos com seguranca.
- Uso mensal projetado permanece abaixo de 10 GB, 1M Classe A e 10M Classe B, com alertas ativos.
- Os testes e build do projeto passam antes do rollout.

Consulte tambem [o plano de configuracao e custo do R2](./plano-cloudflare-r2.md).

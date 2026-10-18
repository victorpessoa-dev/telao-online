# vPlayCast

vPlayCast é uma aplicação para equipes de comunicação paroquial gerenciarem patrocinadores, telões públicos e relatórios de exibição. O projeto possui uma aplicação web pública e uma aplicação Windows administrativa (`V Playcast`).

O projeto usa Next.js App Router, Supabase Auth/Postgres/Storage, RLS, RPCs publicas controladas, Recharts, Radix UI e Tailwind CSS.

## Como Funciona

- No Windows, o administrador entra com email e senha do Supabase. A opção **Manter conectado** guarda somente a sessão cifrada pelo Windows; a senha nunca é salva.
- Na primeira entrada do executável, o administrador escolhe o tema e informa o domínio público. O aplicativo só confirma depois de verificar `/{slug}/ads-telao` no domínio informado.
- Patrocinadores sao cadastrados em `/painel-telao` com imagem, GIF ou video.
- O conteudo ativo aparece em `/ads-telao` ou `/{slug}/ads-telao`.
- O contador de exibicoes pode ser ativado por tipo de telao: NORMAL e MASTER.
- A pagina publica `/` lista patrocinadores, mostra estatisticas e direciona para relatorios.
- Cada patrocinador tem relatorio publico em `/{slug}/anunciantes/:id`.
- Overlays do executável são projetos locais: cada criação recebe um UUID e fica em uma pasta própria no computador. O link para o OBS é `http://127.0.0.1:17850/overlay/:id`; alterações de texto, visibilidade, posição, tamanho ou mídia são atualizadas imediatamente na fonte local.
- A exclusão de um overlay remove somente a pasta local daquele UUID. Overlays e mídias locais não são enviados ao Supabase.

## Limites entre desktop e web

| Executável Windows (admin) | Site público |
| --- | --- |
| Login, ajustes, edição de telões, patrocinadores, métricas e overlays locais | Landing page, comunidade, páginas `/{slug}`, telões `/{slug}/ads-telao` e relatórios públicos |
| URLs locais de Browser Source para OBS | URLs web compartilháveis |
| Dados de projeto de overlay em disco local | Dados públicos e administrativos persistidos no Supabase |

## Documentacao

Comece por [docs/projeto-como-funciona.md](docs/projeto-como-funciona.md).

Indice completo: [docs/README.md](docs/README.md).

## Variaveis Principais

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=
PROVISIONING_API_KEY=
```

As variáveis `NEXT_PUBLIC_*` podem ser expostas ao cliente. `SUPABASE_SERVICE_ROLE_KEY` e `PROVISIONING_API_KEY` são exclusivas do servidor e não podem ser versionadas ou usadas em componentes de cliente. `NEXT_PUBLIC_SITE_URL` define o destino do convite por email.

## Banco de dados novo

Para iniciar um projeto Supabase do zero, execute apenas [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor de um projeto vazio. O arquivo é o schema consolidado: cria tabelas, RLS, Storage, RPCs, índices do telão público e a rotina de métricas em lote. Não execute migrations históricas depois dele.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run desktop:dev
npm run desktop:build:win
```

## Docker

Defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em um arquivo `.env` e inicie a aplicação com:

```bash
docker compose up --build
```

A aplicação ficará disponível em `http://localhost:3000`. O Compose verifica periodicamente se a rota inicial responde antes de marcar o container como saudável.

## Validacao Recomendada

Antes de publicar:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

No Windows, em alguns ambientes sandbox, Vitest/Next podem falhar com `spawn EPERM` ao iniciar workers. Rode fora do sandbox quando isso acontecer.

## Midia

- Imagens JPEG/PNG/WebP sao otimizadas para WebP antes do upload.
- GIF e preservado.
- Videos aceitos: MP4 e WebM.
- Limite atual de upload: 100 MB.

## Seguranca

- Admin bloqueado em mobile.
- Rotas administrativas protegidas por Supabase Auth e pela propriedade da igreja (`churches.admin_id`).
- O desktop usa apenas a chave pública/anon do Supabase; nunca inclua `SUPABASE_SERVICE_ROLE_KEY` no instalador.
- A ponte Electron expõe métodos IPC específicos e não fornece APIs de Node.js ou de arquivos ao renderer.
- Escritas protegidas por RLS com `public.is_admin()`.
- APIs publicas usam RPCs e respostas `no-store`.
- Links publicos sao filtrados para `http/https`.

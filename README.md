# Telão Online

Aplicação web para equipes paroquiais organizarem patrocinadores, mídias e a programação exibida no telão. Cada igreja administra seus próprios dados e disponibiliza uma página pública com patrocinadores e registros de exibição.

## Acesso público

- `/` abre a página pública da única igreja ativa.
- Quando há zero ou mais de uma igreja ativa, `/` direciona para `/igrejas`.
- `/igrejas` lista e permite buscar igrejas com perfil público ativo.
- `/comunidade` é mantida somente como redirecionamento permanente para `/igrejas`.
- `/{slug}` exibe o perfil público de uma igreja; `/{slug}/parceiros/{id}` exibe o detalhe público de um patrocinador.

## Recursos

- Painel administrativo protegido por Supabase Auth.
- Cadastro de patrocinadores com imagens, GIFs e vídeos.
- Programação determinística para os modos NORMAL e MASTER.
- Sessão oficial de exibição, métricas e relatórios públicos.
- Perfil público, links sociais e captação de interesse em patrocínio por igreja.
- Grade TV administrativa e overlays compartilháveis.

## Tecnologias

Next.js App Router, React, Tailwind CSS, Supabase (Auth, Postgres e Storage), RLS, RPCs públicas controladas, Radix UI, Recharts e Vitest.

## Configuração

Crie um arquivo `.env` a partir de `.env.example` e informe:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=
PROVISIONING_API_KEY=
```

As variáveis `NEXT_PUBLIC_*` podem ser expostas ao navegador. `SUPABASE_SERVICE_ROLE_KEY` e `PROVISIONING_API_KEY` são exclusivas do servidor e nunca devem ser versionadas.

## Banco de dados

Para uma instalação nova, execute somente [supabase/schema.sql](supabase/schema.sql) no SQL Editor de um projeto Supabase vazio. Para instalações existentes, siga os scripts de upgrade indicados em [docs/banco-de-dados.md](docs/banco-de-dados.md).

## Desenvolvimento

```bash
npm install
npm run dev
```

Para validar antes de publicar:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Docker

Com as variáveis do Supabase definidas em `.env`:

```bash
docker compose up --build
```

A aplicação fica disponível em `http://localhost:3000`.

## Documentação

- [Índice da documentação](docs/README.md)
- [Como o projeto funciona](docs/projeto-como-funciona.md)
- [Configuração de ambiente](docs/configuracao-de-ambiente.md)
- [Plano futuro de Cloudflare R2](docs/plano-cloudflare-r2.md)
- [Execução futura da integração R2](docs/plano-execucao-cloudflare-r2.md)

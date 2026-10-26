-- Telão Online: limpeza TOTAL dos dados e da estrutura da aplicação.
--
-- ATENÇÃO: este script é DESTRUTIVO e IRREVERSÍVEL. Ele apaga todas as
-- tabelas, dados, views, funções, triggers, tipos, políticas RLS e grants
-- existentes no schema public. Os arquivos do bucket telao-online-midia devem
-- ser removidos antes pela Storage API ou pelo painel do Supabase.
--
-- Escopo preservado: schemas internos do Supabase (auth, storage, realtime,
-- extensions e demais schemas fora de public) NÃO são removidos. As contas
-- de Auth permanecem; o bucket telao-online-midia é preservado e seus arquivos
-- devem ser removidos separadamente pela Storage API ou pelo painel.
--
-- Uso em um projeto Supabase antigo:
--   1. Faça um backup se houver qualquer dado a preservar.
--   2. No painel Storage ou via Storage API, apague todos os arquivos do
--      bucket telao-online-midia. Não use DELETE em storage.objects.
--   3. Execute este arquivo uma única vez no SQL Editor.
--   4. Execute supabase/schema.sql inteiro em seguida para recriar o banco,
--      o único bucket de mídia, as políticas e as funções atuais. Isso
--      restaura as cascatas de igreja/patrocinador; as mídias são removidas
--      pela Storage API nos fluxos administrativos da aplicação.
--
-- Não rode este arquivo em produção se houver dados que ainda precisem ser
-- consultados. Não use com uma transação envolvendo schema.sql: rode cada
-- arquivo separadamente no SQL Editor.

-- Remove as políticas antes do bucket. Isto torna o reset repetível mesmo se
-- o schema public tiver sido alterado manualmente antes da execução.
drop policy if exists telao_online_media_owner_insert on storage.objects;
drop policy if exists telao_online_media_owner_update on storage.objects;
drop policy if exists telao_online_media_owner_delete on storage.objects;

-- Storage é externo ao schema public e suas tabelas são somente leitura em
-- SQL. Os objetos devem ter sido apagados pela Storage API antes deste script.

drop schema if exists public cascade;
create schema public;

-- Restaura as permissões mínimas esperadas pela API do Supabase. O schema.sql
-- recria as permissões específicas de tabelas, RLS e funções da aplicação.
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to postgres, service_role;

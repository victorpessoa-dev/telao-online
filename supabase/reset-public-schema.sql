-- Telão Online: limpeza TOTAL dos dados e da estrutura da aplicação.
--
-- ATENÇÃO: este script é DESTRUTIVO e IRREVERSÍVEL. Ele apaga todas as
-- tabelas, dados, views, funções, triggers, tipos, políticas RLS e grants
-- existentes no schema public, além de toda a mídia do bucket
-- telao-online-midia.
--
-- Escopo preservado: schemas internos do Supabase (auth, storage, realtime,
-- extensions e demais schemas fora de public) NÃO são removidos. As contas
-- de Auth permanecem; somente o bucket que pertence ao Telão Online é limpo.
--
-- Uso em um projeto Supabase antigo:
--   1. Faça um backup se houver qualquer dado a preservar.
--   2. Execute este arquivo uma única vez no SQL Editor.
--   3. Execute supabase/schema.sql inteiro em seguida para recriar o banco,
--      o bucket de mídia, as políticas e as funções atuais.
--
-- Não rode este arquivo em produção se houver dados que ainda precisem ser
-- consultados. Não use com uma transação envolvendo schema.sql: rode cada
-- arquivo separadamente no SQL Editor.

-- Remove as políticas antes do bucket. Isto torna o reset repetível mesmo se
-- o schema public tiver sido alterado manualmente antes da execução.
drop policy if exists telao_online_media_owner_insert on storage.objects;
drop policy if exists telao_online_media_owner_update on storage.objects;
drop policy if exists telao_online_media_owner_delete on storage.objects;

-- O bucket é externo ao schema public e não seria removido pelo DROP SCHEMA.
-- Apague primeiro os objetos para garantir que imagens, vídeos e fundos de
-- telão não sobrevivam a um reset do projeto.
delete from storage.objects where bucket_id = 'telao-online-midia';
delete from storage.buckets where id = 'telao-online-midia';

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

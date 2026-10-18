-- V Playcast: limpeza TOTAL do banco de aplicação antigo.
--
-- ATENÇÃO: este script é DESTRUTIVO e IRREVERSÍVEL. Ele apaga todas as
-- tabelas, dados, views, funções, triggers, tipos, políticas RLS e grants
-- existentes no schema public.
--
-- Escopo preservado: schemas internos do Supabase (auth, storage, realtime,
-- extensions e demais schemas fora de public) NÃO são removidos.
--
-- Uso em um projeto Supabase antigo:
--   1. Faça um backup se houver qualquer dado a preservar.
--   2. Execute este arquivo uma única vez no SQL Editor.
--   3. Execute supabase/schema.sql inteiro em seguida.
--
-- Não rode este arquivo em produção se houver dados que ainda precisem ser
-- consultados. Não use com uma transação envolvendo schema.sql: rode cada
-- arquivo separadamente no SQL Editor.

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

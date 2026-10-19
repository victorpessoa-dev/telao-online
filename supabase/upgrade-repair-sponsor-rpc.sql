-- Repair legacy RPC definitions in existing Supabase projects.
-- Run this whole file once in the Supabase SQL Editor.

create or replace function public.create_admin_sponsor (
  name_arg text,
  kind_arg public.sponsor_kind,
  media_url_arg text,
  media_type_arg public.media_type,
  website_url_arg text,
  duration_seconds_arg integer,
  active_arg boolean,
  church_id_arg uuid
) returns setof public.sponsors
language plpgsql security definer
set search_path = public as $$
begin
  if not public.owns_church(church_id_arg) then
    raise exception 'Você não tem permissão para criar patrocínios nesta igreja'
      using errcode = '42501';
  end if;

  return query
  insert into public.sponsors (
    church_id, name, kind, media_url, media_type, website_url,
    duration_seconds, active
  ) values (
    church_id_arg,
    trim(name_arg),
    kind_arg,
    nullif(trim(media_url_arg), ''),
    media_type_arg,
    nullif(trim(website_url_arg), ''),
    greatest(coalesce(duration_seconds_arg, 10), 1),
    coalesce(active_arg, true)
  ) returning *;
end $$;

-- The older version generated a token with gen_random_bytes(), which is not
-- exposed by every Supabase PostgreSQL installation. Two UUIDs retain ample
-- entropy without that unavailable function.
create or replace function public.open_official_display_session(slug_arg text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_church_id uuid; raw_token text; session_id uuid;
begin
  select id into target_church_id from public.churches
  where slug = lower(trim(slug_arg)) and public.owns_church(id);
  if target_church_id is null then
    raise exception 'Igreja não encontrada ou sem permissão' using errcode = '42501';
  end if;
  if not coalesce((select (value->>'metricsEnabled')::boolean from public.app_settings
    where church_id = target_church_id and key = 'sponsor_settings'), false) then
    raise exception 'Ative o contador antes de abrir o telão oficial';
  end if;

  update public.official_display_sessions set revoked_at = now()
  where church_id = target_church_id and revoked_at is null;

  raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.official_display_sessions(church_id, token_hash, expires_at)
  values(target_church_id, md5(raw_token), now() + interval '12 hours')
  returning id into session_id;
  return jsonb_build_object('sessionId', session_id, 'token', raw_token, 'expiresAt', now() + interval '12 hours');
end $$;

revoke execute on function public.create_admin_sponsor(
  text, public.sponsor_kind, text, public.media_type, text, integer, boolean, uuid
) from anon;
revoke execute on function public.open_official_display_session(text) from anon;
grant execute on function public.create_admin_sponsor(
  text, public.sponsor_kind, text, public.media_type, text, integer, boolean, uuid
) to authenticated;
grant execute on function public.open_official_display_session(text) to authenticated;

-- PostgREST otherwise may continue to advertise the old function signature.
notify pgrst, 'reload schema';

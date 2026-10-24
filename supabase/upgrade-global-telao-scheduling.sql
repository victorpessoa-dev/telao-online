-- Global, deterministic playlist and one authorized display per church.
-- Apply after the existing schema/upgrade scripts.
create table if not exists public.telao_schedules (
  church_id uuid primary key references public.churches(id) on delete cascade,
  version bigint not null default 1,
  seed text not null,
  starts_at timestamptz not null default now(),
  previous_version bigint,
  previous_seed text,
  previous_starts_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.official_display_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  token_hash text not null,
  client_id uuid,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.telao_schedules enable row level security;
alter table public.official_display_sessions enable row level security;

alter table public.sponsor_impressions
  add column if not exists official_display_session_id uuid
  references public.official_display_sessions(id) on delete set null;

create index if not exists official_display_sessions_active_idx
  on public.official_display_sessions(church_id, expires_at)
  where revoked_at is null;

create or replace function public.refresh_telao_schedule(target_church_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare next_start timestamptz;
begin
  -- A minute boundary gives every active display the same handoff instant.
  next_start := date_trunc('minute', now()) + interval '1 minute';
  insert into public.telao_schedules(church_id, version, seed, starts_at)
  values(target_church_id, 1, gen_random_uuid()::text, now())
  on conflict (church_id) do update set
    previous_version = case
      when public.telao_schedules.starts_at > now() then public.telao_schedules.previous_version
      else public.telao_schedules.version end,
    previous_seed = case
      when public.telao_schedules.starts_at > now() then public.telao_schedules.previous_seed
      else public.telao_schedules.seed end,
    previous_starts_at = case
      when public.telao_schedules.starts_at > now() then public.telao_schedules.previous_starts_at
      else public.telao_schedules.starts_at end,
    version = public.telao_schedules.version + 1,
    seed = gen_random_uuid()::text,
    starts_at = next_start,
    updated_at = now();
end $$;

create or replace function public.refresh_telao_schedule_from_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_telao_schedule(
    case when tg_op = 'DELETE' then old.church_id else new.church_id end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists sponsors_refresh_telao_schedule on public.sponsors;
create trigger sponsors_refresh_telao_schedule after insert or update or delete on public.sponsors
for each row execute function public.refresh_telao_schedule_from_content();

create or replace function public.refresh_telao_schedule_from_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.key = 'sponsor_settings' then
    perform public.refresh_telao_schedule(new.church_id);
    if not coalesce((new.value->>'metricsEnabled')::boolean, false) then
      update public.official_display_sessions
      set revoked_at = now()
      where church_id = new.church_id and revoked_at is null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists app_settings_refresh_telao_schedule on public.app_settings;
create trigger app_settings_refresh_telao_schedule after insert or update on public.app_settings
for each row execute function public.refresh_telao_schedule_from_settings();

insert into public.telao_schedules(church_id, seed)
select id, gen_random_uuid()::text from public.churches
on conflict (church_id) do nothing;

create or replace function public.get_active_telao_schedule(target_church_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'version', case when s.starts_at > now() and s.previous_version is not null then s.previous_version else s.version end,
    'seed', case when s.starts_at > now() and s.previous_seed is not null then s.previous_seed else s.seed end,
    'startsAt', case when s.starts_at > now() and s.previous_starts_at is not null then s.previous_starts_at else s.starts_at end,
    'nextVersion', s.version,
    'activatesAt', s.starts_at,
    'serverTime', now()
  ) from public.telao_schedules s where s.church_id = target_church_id
$$;

create or replace function public.get_public_telao_payload(slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'churchId', c.id, 'slug', c.slug, 'version', c.content_version,
    'sponsors', coalesce((select jsonb_agg(to_jsonb(s)) from public.get_public_sponsors(c.id) s), '[]'::jsonb),
    'settings', public.get_sponsor_settings(c.id),
    'schedule', public.get_active_telao_schedule(c.id)
  ) from public.churches c
  where c.slug = lower(trim(slug_arg)) and c.is_active limit 1
$$;

create or replace function public.get_public_telao_version(slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'churchId', c.id, 'version', c.content_version,
    'scheduleVersion', public.get_active_telao_schedule(c.id)->>'version'
  ) from public.churches c where c.slug = lower(trim(slug_arg)) and c.is_active limit 1
$$;

create or replace function public.open_official_display_session(slug_arg text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_church_id uuid; raw_token text; session_id uuid;
begin
  select id into target_church_id from public.churches
  where slug = lower(trim(slug_arg)) and public.owns_church(id);
  if target_church_id is null then raise exception 'Igreja não encontrada ou sem permissão' using errcode = '42501'; end if;
  if not coalesce((select (value->>'metricsEnabled')::boolean from public.app_settings
    where church_id = target_church_id and key = 'sponsor_settings'), false) then
    raise exception 'Ative o contador antes de abrir o telão oficial';
  end if;
  update public.official_display_sessions set revoked_at = now()
  where church_id = target_church_id and revoked_at is null;
  -- Two random UUIDs provide a 244-bit token while avoiding dependence on
  -- gen_random_bytes, which is not exposed by every Supabase installation.
  raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.official_display_sessions(church_id, token_hash, expires_at)
  values(target_church_id, md5(raw_token), now() + interval '12 hours')
  returning id into session_id;
  return jsonb_build_object('sessionId', session_id, 'token', raw_token, 'expiresAt', now() + interval '12 hours');
end $$;

create or replace function public.log_sponsor_impressions(logs_arg jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare count_processed integer := 0; session_id_arg uuid; token_arg text; client_id_arg uuid;
begin
  if logs_arg is null or jsonb_typeof(logs_arg) <> 'array' or jsonb_array_length(logs_arg) = 0 then
    raise exception 'logs_arg must be a non-empty JSON array';
  end if;
  session_id_arg := (logs_arg->0->>'display_session_id')::uuid;
  token_arg := logs_arg->0->>'display_token';
  client_id_arg := (logs_arg->0->>'display_client_id')::uuid;
  if session_id_arg is null or token_arg is null or client_id_arg is null then return 0; end if;
  update public.official_display_sessions ods set client_id = client_id_arg
  where ods.id = session_id_arg and ods.token_hash = md5(token_arg)
    and ods.revoked_at is null and ods.expires_at > now()
    and (ods.client_id is null or ods.client_id = client_id_arg);
  if not found then return 0; end if;
  with logs as (
    select coalesce((item->>'event_id')::uuid, gen_random_uuid()) event_id,
      (item->>'sponsor_id')::uuid sponsor_id,
      greatest(coalesce((item->>'displayed_at')::timestamptz, now()), now() - interval '12 hours') displayed_at,
      least(greatest(coalesce((item->>'duration_seconds')::integer, 0), 0), 3600) duration_seconds,
      least(greatest(coalesce((item->>'views_count')::integer, 1), 1), 10000) views_count,
      coalesce(nullif(item->>'source', ''), 'telao') source
    from jsonb_array_elements(logs_arg) item
  ), eligible as (
    select l.*, ods.id official_display_session_id from logs l
    join public.official_display_sessions ods on ods.id = session_id_arg and ods.client_id = client_id_arg
    join public.sponsors s on s.id = l.sponsor_id and s.church_id = ods.church_id and s.active
    join public.app_settings st on st.church_id = ods.church_id and st.key = 'sponsor_settings'
    where coalesce((st.value->>'metricsEnabled')::boolean, false)
      and not coalesce((st.value->'metricsPaused'->>s.kind::text)::boolean, false)
      and l.displayed_at >= ods.opened_at and l.displayed_at <= now() + interval '1 minute'
  ), inserted as (
    insert into public.sponsor_impressions(event_id, sponsor_id, displayed_at, duration_seconds, views_count, source, official_display_session_id)
    select event_id, sponsor_id, displayed_at, duration_seconds, views_count, source, official_display_session_id from eligible
    on conflict (event_id) do nothing returning sponsor_id, displayed_at, duration_seconds, views_count
  ), totals as (
    select sponsor_id, sum(views_count)::integer views, sum(duration_seconds)::integer total_seconds, max(displayed_at) last_displayed_at
    from inserted group by sponsor_id
  ), updated as (
    update public.sponsors s set views = s.views + t.views, total_seconds = s.total_seconds + t.total_seconds,
      last_displayed_at = greatest(coalesce(s.last_displayed_at, '-infinity'::timestamptz), t.last_displayed_at)
    from totals t where s.id = t.sponsor_id returning s.id
  ), rollups as (
    insert into public.sponsor_impression_daily_rollups(sponsor_id, displayed_on, views, total_seconds, last_displayed_at)
    select sponsor_id, displayed_at::date, sum(views_count)::integer, sum(duration_seconds)::integer, max(displayed_at)
    from inserted group by sponsor_id, displayed_at::date
    on conflict (sponsor_id, displayed_on) do update set views = public.sponsor_impression_daily_rollups.views + excluded.views,
      total_seconds = public.sponsor_impression_daily_rollups.total_seconds + excluded.total_seconds,
      last_displayed_at = greatest(coalesce(public.sponsor_impression_daily_rollups.last_displayed_at, '-infinity'::timestamptz), excluded.last_displayed_at)
  ) select count(*) into count_processed from inserted;
  return count_processed;
end $$;

grant execute on function public.get_active_telao_schedule(uuid), public.open_official_display_session(text), public.log_sponsor_impressions(jsonb) to anon, authenticated;

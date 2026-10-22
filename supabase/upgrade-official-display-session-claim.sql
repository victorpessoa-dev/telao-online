-- Make an official display session claimable by its secret token and the first
-- browser device. IP addresses are intentionally not an authorization factor:
-- public displays may move between legitimate networks during an event.
alter table public.official_display_sessions
  drop column if exists client_ip;

drop function if exists public.claim_official_display_session(uuid, text, uuid, text);
drop function if exists public.claim_official_display_session(uuid, text, uuid);
drop function if exists public.log_sponsor_impressions(jsonb, text);
drop function if exists public.log_sponsor_impressions(jsonb);

create function public.claim_official_display_session(
  session_id_arg uuid, token_arg text, client_id_arg uuid
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.official_display_sessions ods set client_id = client_id_arg
  where ods.id = session_id_arg and ods.token_hash = md5(token_arg)
    and ods.revoked_at is null and ods.expires_at > now()
    and (ods.client_id is null or ods.client_id = client_id_arg);
  return found;
end $$;

create function public.log_sponsor_impressions(logs_arg jsonb)
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
  if not exists (
    select 1 from public.official_display_sessions ods
    where ods.id = session_id_arg and ods.token_hash = md5(token_arg)
      and ods.client_id = client_id_arg and ods.revoked_at is null and ods.expires_at > now()
  ) then return 0; end if;

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

grant execute on function public.claim_official_display_session(uuid, text, uuid) to anon, authenticated;
grant execute on function public.log_sponsor_impressions(jsonb) to anon, authenticated;
notify pgrst, 'reload schema';

-- One stable, compact read model for high-traffic public telões.
-- It is intentionally cache-friendly: the HTTP route caches its result and
-- this query uses the active-sponsor partial index below on a cache miss.
create index if not exists sponsors_public_telao_idx
  on public.sponsors (church_id, kind desc, created_at desc)
  include (id, name, media_url, media_type, image_url, website_url, duration_seconds)
  where active;

create or replace function public.get_public_sponsors (church_id_arg uuid) returns table (
  id uuid,
  name text,
  kind public.sponsor_kind,
  media_url text,
  media_type public.media_type,
  image_url text,
  website_url text,
  duration_seconds integer,
  views integer,
  total_seconds integer,
  last_displayed_at timestamptz
) language sql stable security definer
set search_path = public as $$
  select s.id,s.name,s.kind,coalesce(s.media_url,s.image_url),s.media_type,s.image_url,s.website_url,s.duration_seconds,s.views,s.total_seconds,s.last_displayed_at
  from public.sponsors s
  join public.churches c on c.id = s.church_id and c.is_active
  where s.church_id = church_id_arg and s.active
  order by s.kind desc, s.created_at desc
$$;

create or replace function public.get_public_telao_payload (slug_arg text) returns jsonb
language sql stable security definer
set search_path = public as $$
  select jsonb_build_object(
    'churchId', c.id,
    'slug', c.slug,
    'sponsors', coalesce((
      select jsonb_agg(to_jsonb(s))
      from public.get_public_sponsors(c.id) s
    ), '[]'::jsonb),
    'settings', public.get_sponsor_settings(c.id)
  )
  from public.churches c
  where c.slug = lower(trim(slug_arg)) and c.is_active
  limit 1
$$;

-- Batch metric writes into set-based updates instead of doing two statements
-- per displayed sponsor. The API accepts at most 100 entries per request.
create or replace function public.log_sponsor_impressions (logs_arg jsonb) returns integer
language plpgsql security definer
set search_path = public as $$
declare count_processed integer := 0;
begin
  if logs_arg is null or jsonb_typeof(logs_arg) <> 'array' then
    raise exception 'logs_arg must be a JSON array';
  end if;

  with logs as (
    select
      (item->>'sponsor_id')::uuid as sponsor_id,
      coalesce((item->>'displayed_at')::timestamptz, now()) as displayed_at,
      least(greatest(coalesce((item->>'duration_seconds')::integer, 0), 0), 3600) as duration_seconds,
      coalesce(nullif(item->>'source', ''), 'telao') as source
    from jsonb_array_elements(logs_arg) item
  ), eligible as (
    select l.*
    from logs l
    join public.sponsors s on s.id = l.sponsor_id and s.active
    join public.churches c on c.id = s.church_id and c.is_active
  ), totals as (
    select sponsor_id, count(*)::integer as views, sum(duration_seconds)::integer as total_seconds, max(displayed_at) as last_displayed_at
    from eligible group by sponsor_id
  ), updated as (
    update public.sponsors s
    set views = s.views + t.views,
        total_seconds = s.total_seconds + t.total_seconds,
        last_displayed_at = greatest(coalesce(s.last_displayed_at, '-infinity'::timestamptz), t.last_displayed_at)
    from totals t
    where s.id = t.sponsor_id
    returning s.id
  ), inserted as (
    insert into public.sponsor_impressions (sponsor_id, displayed_at, duration_seconds, source)
    select sponsor_id, displayed_at, duration_seconds, source from eligible
    returning 1
  )
  select count(*) into count_processed from inserted;

  return count_processed;
end $$;

grant execute on function public.get_public_telao_payload(text) to anon, authenticated;

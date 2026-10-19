-- Public-read and telão performance upgrade. Apply before deploying the
-- matching application changes. Existing endpoints remain compatible.

alter table public.churches
  add column if not exists content_version bigint not null default 1;

alter table public.sponsor_impressions
  add column if not exists views_count integer not null default 1
  check (views_count > 0);

create or replace function public.bump_church_content_version () returns trigger
language plpgsql security definer set search_path = public as $$
declare target_church_id uuid;
begin
  target_church_id := case
    when tg_op = 'DELETE' then old.church_id
    else new.church_id
  end;
  update public.churches
  set content_version = content_version + 1
  where id = target_church_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists sponsors_bump_content_version on public.sponsors;
create trigger sponsors_bump_content_version
after insert or update or delete on public.sponsors
for each row execute function public.bump_church_content_version();

drop trigger if exists app_settings_bump_content_version on public.app_settings;
create trigger app_settings_bump_content_version
after insert or update or delete on public.app_settings
for each row execute function public.bump_church_content_version();

create or replace function public.get_public_church_page (slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'church', jsonb_build_object(
      'id', c.id, 'name', c.name, 'slug', c.slug, 'city', c.city,
      'logo_url', c.logo_url, 'cover_url', c.cover_url,
      'social_links', c.social_links,
      'sponsorship_guidelines', c.sponsorship_guidelines,
      'public_views', c.public_views, 'content_version', c.content_version
    ),
    'sponsors', coalesce((
      select jsonb_agg(to_jsonb(s))
      from public.get_public_sponsor_directory(c.id) s
    ), '[]'::jsonb)
  )
  from public.churches c
  where c.slug = lower(trim(slug_arg)) and c.is_active
  limit 1
$$;

create or replace function public.get_public_telao_version (slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('churchId', c.id, 'version', c.content_version)
  from public.churches c
  where c.slug = lower(trim(slug_arg)) and c.is_active
  limit 1
$$;

create or replace function public.get_public_telao_payload (slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'churchId', c.id, 'slug', c.slug, 'version', c.content_version,
    'sponsors', coalesce((select jsonb_agg(to_jsonb(s)) from public.get_public_sponsors(c.id) s), '[]'::jsonb),
    'settings', public.get_sponsor_settings(c.id)
  ) from public.churches c
  where c.slug = lower(trim(slug_arg)) and c.is_active limit 1
$$;

-- A batch can contain one aggregate per sponsor/day. The legacy shape has an
-- implicit views_count of 1, so screens running an older client remain valid.
create or replace function public.log_sponsor_impressions (logs_arg jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare count_processed integer := 0;
begin
  if logs_arg is null or jsonb_typeof(logs_arg) <> 'array' then
    raise exception 'logs_arg must be a JSON array';
  end if;
  with logs as (
    select coalesce((item->>'event_id')::uuid, gen_random_uuid()) event_id,
      (item->>'sponsor_id')::uuid sponsor_id,
      coalesce((item->>'displayed_at')::timestamptz, now()) displayed_at,
      least(greatest(coalesce((item->>'duration_seconds')::integer, 0), 0), 86400) duration_seconds,
      least(greatest(coalesce((item->>'views_count')::integer, 1), 1), 10000) views_count,
      coalesce(nullif(item->>'source', ''), 'telao') source
    from jsonb_array_elements(logs_arg) item
  ), eligible as (
    select l.* from logs l join public.sponsors s on s.id = l.sponsor_id and s.active
      join public.churches c on c.id = s.church_id and c.is_active
  ), inserted as (
    insert into public.sponsor_impressions(event_id,sponsor_id,displayed_at,duration_seconds,views_count,source)
    select event_id,sponsor_id,displayed_at,duration_seconds,views_count,source from eligible
    on conflict (event_id) do nothing
    returning sponsor_id,displayed_at,duration_seconds,views_count
  ), totals as (
    select sponsor_id,sum(views_count)::integer views,sum(duration_seconds)::integer total_seconds,max(displayed_at) last_displayed_at
    from inserted group by sponsor_id
  ), updated as (
    update public.sponsors s set views=s.views+t.views,total_seconds=s.total_seconds+t.total_seconds,
      last_displayed_at=greatest(coalesce(s.last_displayed_at, '-infinity'::timestamptz),t.last_displayed_at)
    from totals t where s.id=t.sponsor_id returning s.id
  ), rollups as (
    insert into public.sponsor_impression_daily_rollups(sponsor_id,displayed_on,views,total_seconds,last_displayed_at)
    select sponsor_id,displayed_at::date,sum(views_count)::integer,sum(duration_seconds)::integer,max(displayed_at)
    from inserted group by sponsor_id,displayed_at::date
    on conflict (sponsor_id,displayed_on) do update set
      views=public.sponsor_impression_daily_rollups.views + excluded.views,
      total_seconds=public.sponsor_impression_daily_rollups.total_seconds + excluded.total_seconds,
      last_displayed_at=greatest(coalesce(public.sponsor_impression_daily_rollups.last_displayed_at, '-infinity'::timestamptz),excluded.last_displayed_at)
  ) select coalesce(sum(views_count), 0)::integer into count_processed from inserted;
  return count_processed;
end $$;

grant execute on function public.get_public_church_page(text), public.get_public_telao_version(text) to anon, authenticated;

-- Telão Online: consolidated, idempotent migration for existing projects.
-- Execute this file once in Supabase SQL Editor. It supersedes the separate
-- public-profile, sponsor-reporting, sponsorship-guidelines and performance upgrades.

create extension if not exists pgcrypto;

alter table public.churches
  add column if not exists public_views integer not null default 0 check (public_views >= 0),
  add column if not exists sponsorship_guidelines text not null default '',
  add column if not exists content_version bigint not null default 1;

alter table public.sponsor_impressions
  add column if not exists event_id uuid,
  add column if not exists views_count integer not null default 1 check (views_count > 0);

alter table public.sponsor_impressions
  alter column event_id set default gen_random_uuid();

update public.sponsor_impressions
set event_id = gen_random_uuid()
where event_id is null;

alter table public.sponsor_impressions
  alter column event_id set not null;

create unique index if not exists sponsor_impressions_event_id_key
  on public.sponsor_impressions (event_id);
create index if not exists sponsor_impressions_sponsor_displayed_idx
  on public.sponsor_impressions (sponsor_id, displayed_at desc);

create table if not exists public.sponsor_impression_daily_rollups (
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  displayed_on date not null,
  views integer not null default 0 check (views >= 0),
  total_seconds integer not null default 0 check (total_seconds >= 0),
  last_displayed_at timestamptz,
  primary key (sponsor_id, displayed_on)
);
create index if not exists sponsor_impression_daily_rollups_sponsor_day_idx
  on public.sponsor_impression_daily_rollups (sponsor_id, displayed_on desc);

-- Seed daily totals only when the rollup row does not yet exist. Re-running
-- this migration must never add historical impressions a second time.
insert into public.sponsor_impression_daily_rollups (
  sponsor_id, displayed_on, views, total_seconds, last_displayed_at
)
select sponsor_id, displayed_at::date, sum(views_count)::integer,
  sum(duration_seconds)::integer, max(displayed_at)
from public.sponsor_impressions
group by sponsor_id, displayed_at::date
on conflict (sponsor_id, displayed_on) do nothing;

alter table public.sponsor_impression_daily_rollups enable row level security;
drop policy if exists impression_rollups_owner_read on public.sponsor_impression_daily_rollups;
create policy impression_rollups_owner_read on public.sponsor_impression_daily_rollups for select
to authenticated using (
  exists (select 1 from public.sponsors s
    where s.id = sponsor_id and public.owns_church(s.church_id))
);
grant select on public.sponsor_impression_daily_rollups to authenticated;

create or replace function public.bump_church_content_version () returns trigger
language plpgsql security definer set search_path = public as $$
declare target_church_id uuid;
begin
  target_church_id := case when tg_op = 'DELETE' then old.church_id else new.church_id end;
  update public.churches set content_version = content_version + 1 where id = target_church_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists sponsors_bump_content_version on public.sponsors;
create trigger sponsors_bump_content_version after insert or update or delete on public.sponsors
for each row execute function public.bump_church_content_version();
drop trigger if exists app_settings_bump_content_version on public.app_settings;
create trigger app_settings_bump_content_version after insert or update or delete on public.app_settings
for each row execute function public.bump_church_content_version();

create or replace function public.record_public_church_visit (slug_arg text) returns integer
language plpgsql security definer set search_path = public as $$
declare next_views integer;
begin
  update public.churches set public_views = public_views + 1
  where slug = lower(trim(slug_arg)) and is_active
  returning public_views into next_views;
  return coalesce(next_views, 0);
end $$;

-- The old version returned fewer columns, so PostgreSQL requires recreation.
drop function if exists public.get_public_church_by_slug(text);
create or replace function public.get_public_church_by_slug (slug_arg text) returns table (
  id uuid, name text, slug text, city text, logo_url text, cover_url text,
  social_links jsonb, sponsorship_guidelines text, public_views integer
) language sql stable security definer set search_path = public as $$
  select c.id,c.name,c.slug,c.city,c.logo_url,c.cover_url,c.social_links,
    c.sponsorship_guidelines,c.public_views
  from public.churches c where c.slug=lower(trim(slug_arg)) and c.is_active limit 1
$$;

create or replace function public.get_public_sponsor_report (
  sponsor_id_arg uuid, church_id_arg uuid, page_arg integer default 1,
  page_size_arg integer default 20
) returns jsonb language sql stable security definer set search_path = public as $$
  with authorized as (
    select s.id,s.views from public.sponsors s where s.id=sponsor_id_arg
      and s.church_id=church_id_arg and s.active and public.is_public_church(s.church_id)
  ), paging as (
    select greatest(1,coalesce(page_arg,1)) page,
      least(100,greatest(1,coalesce(page_size_arg,20))) page_size
  ), page_logs as (
    select si.id,si.displayed_at,si.duration_seconds,si.views_count,si.source
    from public.sponsor_impressions si join authorized a on a.id=si.sponsor_id, paging p
    order by si.displayed_at desc limit (select page_size from paging)
    offset ((select page from paging)-1)*(select page_size from paging)
  ), daily as (
    select r.displayed_on,r.views,r.total_seconds from public.sponsor_impression_daily_rollups r
    join authorized a on a.id=r.sponsor_id order by r.displayed_on asc
  ) select jsonb_build_object(
    'page',(select page from paging),'pageSize',(select page_size from paging),
    'totalItems',coalesce((select views from authorized),0),
    'logs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'displayed_at',displayed_at,
      'duration_seconds',duration_seconds,'views_count',views_count,'source',source)
      order by displayed_at desc) from page_logs),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(jsonb_build_object('displayed_on',displayed_on,
      'views',views,'total_seconds',total_seconds) order by displayed_on asc) from daily),'[]'::jsonb)
  )
$$;

create or replace function public.get_public_church_page (slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'church',jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'city',c.city,
      'logo_url',c.logo_url,'cover_url',c.cover_url,'social_links',c.social_links,
      'sponsorship_guidelines',c.sponsorship_guidelines,'public_views',c.public_views,
      'content_version',c.content_version),
    'sponsors',coalesce((select jsonb_agg(to_jsonb(s))
      from public.get_public_sponsor_directory(c.id) s),'[]'::jsonb)
  ) from public.churches c where c.slug=lower(trim(slug_arg)) and c.is_active limit 1
$$;

create or replace function public.get_public_telao_version (slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('churchId',c.id,'version',c.content_version)
  from public.churches c where c.slug=lower(trim(slug_arg)) and c.is_active limit 1
$$;

create or replace function public.get_public_telao_payload (slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('churchId',c.id,'slug',c.slug,'version',c.content_version,
    'sponsors',coalesce((select jsonb_agg(to_jsonb(s)) from public.get_public_sponsors(c.id) s),'[]'::jsonb),
    'settings',public.get_sponsor_settings(c.id))
  from public.churches c where c.slug=lower(trim(slug_arg)) and c.is_active limit 1
$$;

create or replace function public.log_sponsor_impressions (logs_arg jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare count_processed integer := 0;
begin
  if logs_arg is null or jsonb_typeof(logs_arg) <> 'array' then
    raise exception 'logs_arg must be a JSON array';
  end if;
  with logs as (
    select coalesce((item->>'event_id')::uuid,gen_random_uuid()) event_id,
      (item->>'sponsor_id')::uuid sponsor_id,
      coalesce((item->>'displayed_at')::timestamptz,now()) displayed_at,
      least(greatest(coalesce((item->>'duration_seconds')::integer,0),0),86400) duration_seconds,
      least(greatest(coalesce((item->>'views_count')::integer,1),1),10000) views_count,
      coalesce(nullif(item->>'source',''),'telao') source
    from jsonb_array_elements(logs_arg) item
  ), eligible as (
    select l.* from logs l join public.sponsors s on s.id=l.sponsor_id and s.active
    join public.churches c on c.id=s.church_id and c.is_active
  ), inserted as (
    insert into public.sponsor_impressions(event_id,sponsor_id,displayed_at,duration_seconds,views_count,source)
    select event_id,sponsor_id,displayed_at,duration_seconds,views_count,source from eligible
    on conflict(event_id) do nothing returning sponsor_id,displayed_at,duration_seconds,views_count
  ), totals as (
    select sponsor_id,sum(views_count)::integer views,sum(duration_seconds)::integer total_seconds,
      max(displayed_at) last_displayed_at from inserted group by sponsor_id
  ), updated as (
    update public.sponsors s set views=s.views+t.views,total_seconds=s.total_seconds+t.total_seconds,
      last_displayed_at=greatest(coalesce(s.last_displayed_at,'-infinity'::timestamptz),t.last_displayed_at)
    from totals t where s.id=t.sponsor_id returning s.id
  ), rollups as (
    insert into public.sponsor_impression_daily_rollups(sponsor_id,displayed_on,views,total_seconds,last_displayed_at)
    select sponsor_id,displayed_at::date,sum(views_count)::integer,sum(duration_seconds)::integer,max(displayed_at)
    from inserted group by sponsor_id,displayed_at::date
    on conflict(sponsor_id,displayed_on) do update set
      views=public.sponsor_impression_daily_rollups.views+excluded.views,
      total_seconds=public.sponsor_impression_daily_rollups.total_seconds+excluded.total_seconds,
      last_displayed_at=greatest(coalesce(public.sponsor_impression_daily_rollups.last_displayed_at,'-infinity'::timestamptz),excluded.last_displayed_at)
  ) select coalesce(sum(views_count),0)::integer into count_processed from inserted;
  return count_processed;
end $$;

grant execute on function public.record_public_church_visit(text),
  public.get_public_church_by_slug(text), public.get_public_church_page(text),
  public.get_public_telao_version(text), public.get_public_telao_payload(text),
  public.get_public_sponsor_report(uuid,uuid,integer,integer),
  public.log_sponsor_impressions(jsonb) to anon, authenticated;

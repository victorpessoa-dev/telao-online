-- Apply this upgrade once to existing installations before deploying the
-- idempotent display queue and paginated sponsor reports.

alter table public.sponsor_impressions
  add column if not exists event_id uuid;

alter table public.sponsor_impressions
  alter column event_id set default gen_random_uuid();

update public.sponsor_impressions
set event_id = gen_random_uuid()
where event_id is null;

alter table public.sponsor_impressions
  alter column event_id set not null;

create unique index if not exists sponsor_impressions_event_id_key
  on public.sponsor_impressions (event_id);

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

-- Backfill existing raw impressions once. The conflict clause keeps this safe
-- if the script is retried.
insert into public.sponsor_impression_daily_rollups (
  sponsor_id, displayed_on, views, total_seconds, last_displayed_at
)
select
  sponsor_id,
  displayed_at::date,
  count(*)::integer,
  sum(duration_seconds)::integer,
  max(displayed_at)
from public.sponsor_impressions
group by sponsor_id, displayed_at::date
on conflict (sponsor_id, displayed_on) do update set
  views = excluded.views,
  total_seconds = excluded.total_seconds,
  last_displayed_at = excluded.last_displayed_at;

alter table public.sponsor_impression_daily_rollups enable row level security;

drop policy if exists impression_rollups_owner_read on public.sponsor_impression_daily_rollups;
create policy impression_rollups_owner_read on public.sponsor_impression_daily_rollups for
select to authenticated using (
  exists (
    select 1 from public.sponsors s
    where s.id = sponsor_id and public.owns_church(s.church_id)
  )
);

grant select on public.sponsor_impression_daily_rollups to authenticated;

drop function if exists public.get_public_sponsor_impressions(uuid, uuid);

create or replace function public.get_public_sponsor_report (
  sponsor_id_arg uuid,
  church_id_arg uuid,
  page_arg integer default 1,
  page_size_arg integer default 20
) returns jsonb language sql stable security definer
set search_path = public as $$
  with authorized as (
    select s.id,s.views from public.sponsors s
    where s.id = sponsor_id_arg and s.church_id = church_id_arg
      and s.active and public.is_public_church(s.church_id)
  ), paging as (
    select greatest(1, coalesce(page_arg, 1)) as page,
      least(100, greatest(1, coalesce(page_size_arg, 20))) as page_size
  ), impressions as (
    select si.id,si.displayed_at,si.duration_seconds,si.source
    from public.sponsor_impressions si join authorized a on a.id = si.sponsor_id
  ), page_logs as (
    select i.* from impressions i, paging p order by i.displayed_at desc
    limit (select page_size from paging)
    offset ((select page from paging) - 1) * (select page_size from paging)
  ), daily as (
    select r.displayed_on,r.views,r.total_seconds
    from public.sponsor_impression_daily_rollups r
    join authorized a on a.id = r.sponsor_id
    order by r.displayed_on asc
  )
  select jsonb_build_object(
    'page', (select page from paging),
    'pageSize', (select page_size from paging),
    'totalItems', coalesce((select views from authorized), 0),
    'logs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'displayed_at', displayed_at,
      'duration_seconds', duration_seconds, 'source', source
    ) order by displayed_at desc) from page_logs), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
      'displayed_on', displayed_on, 'views', views, 'total_seconds', total_seconds
    ) order by displayed_on asc) from daily), '[]'::jsonb)
  )
$$;

create or replace function public.log_sponsor_impressions (logs_arg jsonb) returns integer language plpgsql security definer
set search_path = public as $$
declare count_processed integer := 0;
begin
  if logs_arg is null or jsonb_typeof(logs_arg) <> 'array' then
    raise exception 'logs_arg must be a JSON array';
  end if;

  with logs as (
    select coalesce((item->>'event_id')::uuid, gen_random_uuid()) as event_id,
      (item->>'sponsor_id')::uuid as sponsor_id,
      coalesce((item->>'displayed_at')::timestamptz, now()) as displayed_at,
      least(greatest(coalesce((item->>'duration_seconds')::integer, 0), 0), 3600) as duration_seconds,
      coalesce(nullif(item->>'source', ''), 'telao') as source
    from jsonb_array_elements(logs_arg) item
  ), eligible as (
    select l.* from logs l
    join public.sponsors s on s.id = l.sponsor_id and s.active
    join public.churches c on c.id = s.church_id and c.is_active
  ), inserted as (
    insert into public.sponsor_impressions(event_id,sponsor_id,displayed_at,duration_seconds,source)
    select event_id,sponsor_id,displayed_at,duration_seconds,source from eligible
    on conflict (event_id) do nothing
    returning sponsor_id,displayed_at,duration_seconds
  ), totals as (
    select sponsor_id,count(*)::integer as views,sum(duration_seconds)::integer as total_seconds,max(displayed_at) as last_displayed_at
    from inserted group by sponsor_id
  ), updated as (
    update public.sponsors s set
      views = s.views + t.views,
      total_seconds = s.total_seconds + t.total_seconds,
      last_displayed_at = greatest(coalesce(s.last_displayed_at, '-infinity'::timestamptz), t.last_displayed_at)
    from totals t where s.id = t.sponsor_id
    returning s.id
  ), rollups as (
    insert into public.sponsor_impression_daily_rollups(
      sponsor_id,displayed_on,views,total_seconds,last_displayed_at
    )
    select sponsor_id,displayed_at::date,count(*)::integer,sum(duration_seconds)::integer,max(displayed_at)
    from inserted group by sponsor_id,displayed_at::date
    on conflict (sponsor_id,displayed_on) do update set
      views = public.sponsor_impression_daily_rollups.views + excluded.views,
      total_seconds = public.sponsor_impression_daily_rollups.total_seconds + excluded.total_seconds,
      last_displayed_at = greatest(
        coalesce(public.sponsor_impression_daily_rollups.last_displayed_at, '-infinity'::timestamptz),
        excluded.last_displayed_at
      )
    returning sponsor_id
  ) select count(*) into count_processed from inserted;

  return count_processed;
end $$;

grant execute on function public.get_public_sponsor_report(uuid, uuid, integer, integer) to anon, authenticated;
grant execute on function public.log_sponsor_impressions(jsonb) to anon, authenticated;

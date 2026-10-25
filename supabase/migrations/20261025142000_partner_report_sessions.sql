-- Store and expose public partner reporting by official display session.
-- Existing impressions remain valid; historical aggregated rows appear as one
-- detail item because their individual cycles were not persisted separately.
grant select on public.sponsors to anon;

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
    select si.id,si.displayed_at,si.duration_seconds,si.views_count,si.source,
      si.official_display_session_id,
      ods.opened_at as session_opened_at,
      ods.revoked_at as session_revoked_at,
      ods.expires_at as session_expires_at
    from public.sponsor_impressions si
    join authorized a on a.id = si.sponsor_id
    left join public.official_display_sessions ods
      on ods.id = si.official_display_session_id
  ), session_summaries as (
    select coalesce(i.official_display_session_id, i.id) as session_id,
      min(coalesce(i.session_opened_at, i.displayed_at)) as opened_at,
      max(coalesce(
        i.session_revoked_at,
        case when i.session_expires_at <= now() then i.session_expires_at end
      )) as closed_at,
      sum(i.views_count)::integer as views_count,
      sum(i.duration_seconds)::integer as total_seconds
    from impressions i
    group by coalesce(i.official_display_session_id, i.id)
  ), page_sessions as (
    select s.* from session_summaries s, paging p
    order by s.opened_at desc
    limit (select page_size from paging)
    offset ((select page from paging) - 1) * (select page_size from paging)
  ), sessions as (
    select ps.*,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'displayed_at', i.displayed_at,
          'duration_seconds', i.duration_seconds,
          'views_count', i.views_count,
          'source', i.source
        ) order by i.displayed_at asc)
        from impressions i
        where coalesce(i.official_display_session_id, i.id) = ps.session_id
      ), '[]'::jsonb) as events
    from page_sessions ps
  ), daily as (
    select r.displayed_on,r.views,r.total_seconds
    from public.sponsor_impression_daily_rollups r
    join authorized a on a.id = r.sponsor_id
    order by r.displayed_on asc
  )
  select jsonb_build_object(
    'page', (select page from paging),
    'pageSize', (select page_size from paging),
    'totalItems', (select count(*) from session_summaries),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', session_id,
      'opened_at', opened_at,
      'closed_at', closed_at,
      'views_count', views_count,
      'total_seconds', total_seconds,
      'events', events
    ) order by opened_at desc) from sessions), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
      'displayed_on', displayed_on, 'views', views, 'total_seconds', total_seconds
    ) order by displayed_on asc) from daily), '[]'::jsonb)
  )
$$;

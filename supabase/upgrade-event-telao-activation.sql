-- Makes the public telão available only while the event control is enabled.
-- Apply after upgrade-global-telao-scheduling.sql and
-- upgrade-official-display-session-claim.sql on existing databases.

create or replace function public.get_public_telao_payload(slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((public.get_sponsor_settings(c.id)->>'metricsEnabled')::boolean, false)
      then jsonb_build_object(
        'active', true, 'churchId', c.id, 'slug', c.slug, 'version', c.content_version,
        'sponsors', coalesce((select jsonb_agg(to_jsonb(s)) from public.get_public_sponsors(c.id) s), '[]'::jsonb),
        'settings', public.get_sponsor_settings(c.id),
        'schedule', public.get_active_telao_schedule(c.id)
      )
    else jsonb_build_object(
      'active', false, 'settings', public.get_sponsor_settings(c.id)
    )
  end from public.churches c
  where c.slug = lower(trim(slug_arg)) and c.is_active limit 1
$$;

create or replace function public.get_public_telao_version(slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((public.get_sponsor_settings(c.id)->>'metricsEnabled')::boolean, false)
      then jsonb_build_object(
        'active', true, 'churchId', c.id, 'version', c.content_version,
        'scheduleVersion', public.get_active_telao_schedule(c.id)->>'version'
      )
    else jsonb_build_object('active', false)
  end from public.churches c where c.slug = lower(trim(slug_arg)) and c.is_active limit 1
$$;

notify pgrst, 'reload schema';

-- Completes the sponsor-slug rollout for existing databases. Keep this in a
-- separate migration because schema.sql is only used for fresh projects.

-- Replacing a function with a changed argument list creates an overload.
-- Remove the old signatures so PostgREST exposes one unambiguous RPC.
drop function if exists public.create_admin_sponsor(
  text, public.sponsor_kind, text, public.media_type, text, integer, boolean, uuid
);
drop function if exists public.update_admin_sponsor(
  uuid, text, public.sponsor_kind, text, public.media_type, text, integer, boolean
);

-- Databases where the first slug migration was applied to an empty table may
-- still have the old global uniqueness constraint. URLs are church-scoped.
alter table public.sponsors drop constraint if exists sponsors_slug_key;
create unique index if not exists sponsors_church_slug_key
  on public.sponsors (church_id, slug);

create or replace function public.create_admin_sponsor (
  name_arg text,
  kind_arg public.sponsor_kind,
  media_url_arg text,
  media_type_arg public.media_type,
  website_url_arg text,
  duration_seconds_arg integer,
  active_arg boolean,
  slug_arg text,
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
    duration_seconds, active, slug
  ) values (
    church_id_arg, trim(name_arg), kind_arg, nullif(trim(media_url_arg), ''),
    media_type_arg, nullif(trim(website_url_arg), ''),
    greatest(coalesce(duration_seconds_arg, 10), 1), coalesce(active_arg, true),
    lower(trim(coalesce(slug_arg, '')))
  ) returning *;
end $$;

create or replace function public.update_admin_sponsor (
  sponsor_id_arg uuid,
  name_arg text,
  kind_arg public.sponsor_kind,
  media_url_arg text,
  media_type_arg public.media_type,
  website_url_arg text,
  duration_seconds_arg integer,
  active_arg boolean,
  slug_arg text
) returns setof public.sponsors
language plpgsql security definer
set search_path = public as $$
begin
  return query
  update public.sponsors as s
  set
    name = trim(name_arg),
    kind = kind_arg,
    media_url = nullif(trim(media_url_arg), ''),
    media_type = media_type_arg,
    website_url = nullif(trim(website_url_arg), ''),
    duration_seconds = greatest(coalesce(duration_seconds_arg, 10), 1),
    active = coalesce(active_arg, true),
    slug = lower(trim(coalesce(slug_arg, s.slug)))
  where s.id = sponsor_id_arg and public.owns_church(s.church_id)
  returning s.*;

  if not found then
    raise exception 'Patrocínio não encontrado ou sem permissão para alteração'
      using errcode = '42501';
  end if;
end $$;

-- Recreate this pair because adding `slug` changes its table return type.
drop function if exists public.get_public_church_page(text);
drop function if exists public.get_public_sponsor_directory(uuid);

create function public.get_public_sponsor_directory (church_id_arg uuid) returns table (
  id uuid,
  slug text,
  name text,
  kind public.sponsor_kind,
  media_url text,
  media_type public.media_type,
  image_url text,
  website_url text,
  duration_seconds integer,
  views integer,
  total_seconds integer,
  active boolean,
  last_displayed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) language sql stable security definer set search_path = public as $$
  select s.id,s.slug,s.name,s.kind,coalesce(s.media_url,s.image_url),s.media_type,s.image_url,s.website_url,s.duration_seconds,s.views,s.total_seconds,s.active,s.last_displayed_at,s.created_at,s.updated_at
  from public.sponsors s
  where s.church_id = church_id_arg and s.active and public.is_public_church(s.church_id)
  order by s.created_at desc
$$;

create function public.get_public_church_page (slug_arg text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'church', jsonb_build_object(
      'id',c.id,'name',c.name,'slug',c.slug,'city',c.city,'logo_url',c.logo_url,
      'cover_url',c.cover_url,'social_links',c.social_links,
      'sponsorship_guidelines',c.sponsorship_guidelines,'public_views',c.public_views,
      'content_version',c.content_version
    ),
    'sponsors',coalesce((select jsonb_agg(to_jsonb(s)) from public.get_public_sponsor_directory(c.id) s),'[]'::jsonb)
  ) from public.churches c where c.slug=lower(trim(slug_arg)) and c.is_active limit 1
$$;

revoke execute on function public.create_admin_sponsor(
  text, public.sponsor_kind, text, public.media_type, text, integer, boolean, text, uuid
) from anon;
revoke execute on function public.update_admin_sponsor(
  uuid, text, public.sponsor_kind, text, public.media_type, text, integer, boolean, text
) from anon;
grant execute on function public.create_admin_sponsor(
  text, public.sponsor_kind, text, public.media_type, text, integer, boolean, text, uuid
) to authenticated;
grant execute on function public.update_admin_sponsor(
  uuid, text, public.sponsor_kind, text, public.media_type, text, integer, boolean, text
) to authenticated;

notify pgrst, 'reload schema';

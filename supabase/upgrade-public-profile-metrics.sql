-- Apply this upgrade to an existing vPlayCast public schema before deploying
-- the profile-visit metric. New projects receive the same definitions from
-- schema.sql.
alter table public.churches
  add column if not exists public_views integer not null default 0
  check (public_views >= 0);

drop function if exists public.get_public_church_by_slug(text);

create function public.get_public_church_by_slug (slug_arg text) returns table (
  id uuid,
  name text,
  slug text,
  city text,
  logo_url text,
  cover_url text,
  social_links jsonb,
  public_views integer
) language sql stable security definer
set search_path = public as $$
  select c.id,c.name,c.slug,c.city,c.logo_url,c.cover_url,c.social_links,c.public_views
  from public.churches c
  where c.slug=slug_arg and c.is_active
  limit 1
$$;

create or replace function public.record_public_church_visit (slug_arg text) returns integer
language plpgsql security definer
set search_path = public as $$
declare
  next_views integer;
begin
  update public.churches
  set public_views = public_views + 1
  where slug = lower(trim(slug_arg)) and is_active
  returning public_views into next_views;

  return coalesce(next_views, 0);
end $$;

grant execute on function public.record_public_church_visit(text) to anon, authenticated;

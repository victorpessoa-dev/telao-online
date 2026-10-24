-- Apply once to existing installations before publishing church-specific
-- sponsorship instructions on /{slug}/patrocinar.

alter table public.churches
  add column if not exists sponsorship_guidelines text not null default '';

drop function if exists public.get_public_church_by_slug(text);

create function public.get_public_church_by_slug (slug_arg text) returns table (
  id uuid,
  name text,
  slug text,
  city text,
  logo_url text,
  cover_url text,
  social_links jsonb,
  sponsorship_guidelines text,
  public_views integer
) language sql stable security definer
set search_path = public as $$
  select
    c.id,c.name,c.slug,c.city,c.logo_url,c.cover_url,c.social_links,
    c.sponsorship_guidelines,c.public_views
  from public.churches c
  where c.slug = slug_arg and c.is_active
  limit 1
$$;

grant execute on function public.get_public_church_by_slug(text) to anon, authenticated;

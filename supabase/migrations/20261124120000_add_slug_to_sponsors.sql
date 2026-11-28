-- Sponsor URLs are scoped by their church, therefore uniqueness is per church.
-- Add the column nullable first: adding a NOT NULL column to an existing table
-- would fail before this migration gets the chance to backfill old rows.
alter table public.sponsors add column if not exists slug text;
alter table public.sponsors alter column slug drop not null;

-- Produce a valid and deterministic value for every historical row. The id
-- suffix avoids collisions between sponsors with equal (or punctuation-only)
-- names without relying on an unavailable `unaccent` extension.
with normalized as (
  select
    id,
    trim(both '-' from regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g')) as base_slug
  from public.sponsors
)
update public.sponsors s
set slug = left(coalesce(nullif(normalized.base_slug, ''), 'patrocinador'), 87)
  || '-' || replace(s.id::text, '-', '')
from normalized
where s.id = normalized.id and (s.slug is null or btrim(s.slug) = '');

-- A previous incomplete attempt may have created a global unique constraint.
alter table public.sponsors drop constraint if exists sponsors_slug_key;
alter table public.sponsors drop constraint if exists sponsors_slug_format;
alter table public.sponsors
  add constraint sponsors_slug_format
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
alter table public.sponsors alter column slug set not null;
create unique index if not exists sponsors_church_slug_key
  on public.sponsors (church_id, slug);

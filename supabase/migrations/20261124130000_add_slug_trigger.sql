-- Generate a valid, per-church slug before constraints are checked.
-- The application normally supplies the slug; this is a safe database fallback
-- for direct inserts and integrations.
create or replace function public.handle_new_sponsor_slug()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  new.slug := trim(both '-' from regexp_replace(lower(coalesce(new.slug, '')), '[^a-z0-9]+', '-', 'g'));
  if new.slug is null or new.slug = '' then
    new.slug := coalesce(
      nullif(trim(both '-' from regexp_replace(lower(trim(new.name)), '[^a-z0-9]+', '-', 'g')), ''),
      'patrocinador'
    ) || '-' || replace(new.id::text, '-', '');
  end if;
  return new;
end $$;

drop trigger if exists sponsors_auto_slug_trigger on public.sponsors;
create trigger sponsors_auto_slug_trigger
before insert or update of slug, name on public.sponsors
for each row
execute function public.handle_new_sponsor_slug();

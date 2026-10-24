-- Telão Online storage migration for existing projects.
-- Creates the new upload bucket without deleting legacy buckets or objects.

insert into storage.buckets (id, name, public)
values ('telao-online-midia', 'telao-online-midia', true)
on conflict (id) do update set public = true;

drop policy if exists telao_online_media_owner_insert on storage.objects;
create policy telao_online_media_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'telao-online-midia'
  and public.owns_media_object(name)
);

drop policy if exists telao_online_media_owner_update on storage.objects;
create policy telao_online_media_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'telao-online-midia'
  and public.owns_media_object(name)
)
with check (
  bucket_id = 'telao-online-midia'
  and public.owns_media_object(name)
);

drop policy if exists telao_online_media_owner_delete on storage.objects;
create policy telao_online_media_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'telao-online-midia'
  and public.owns_media_object(name)
);

create or replace function public.delete_church_media_objects () returns trigger language plpgsql security definer
set search_path = public, storage as $$
begin
  delete from storage.objects
  where bucket_id in ('telao-online-midia', 'v-playcast-midia', 'pascom-media')
    and name like old.id::text || '/%';
  return old;
end $$;

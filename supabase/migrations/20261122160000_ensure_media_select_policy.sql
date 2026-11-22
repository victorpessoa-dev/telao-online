-- Supabase Storage requires both SELECT and DELETE permissions for an
-- authenticated client to remove an object. Scope reads to the same church
-- folder used by the insert/update/delete policies.

drop policy if exists telao_online_media_owner_select on storage.objects;
create policy telao_online_media_owner_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'telao-online-midia'
  and public.owns_media_object(name)
);

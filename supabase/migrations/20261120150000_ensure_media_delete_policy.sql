-- Ensures authenticated church administrators can remove only their own
-- uploads from the Telão Online media bucket through the Storage API.
-- This migration is safe to run on projects that already have the policy.

create or replace function public.owns_media_object (object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  church_folder uuid;
begin
  church_folder := (storage.foldername(object_name))[1]::uuid;
  return public.owns_church(church_folder);
exception when invalid_text_representation then
  return false;
end;
$$;

grant execute on function public.owns_media_object(text) to authenticated;

drop policy if exists telao_online_media_owner_delete on storage.objects;
create policy telao_online_media_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'telao-online-midia'
  and public.owns_media_object(name)
);

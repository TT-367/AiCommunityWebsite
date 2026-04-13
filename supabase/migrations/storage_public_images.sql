insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read public-images" on storage.objects;
create policy "public read public-images" on storage.objects
for select
to public
using (bucket_id = 'public-images');

drop policy if exists "auth upload public-images" on storage.objects;
create policy "auth upload public-images" on storage.objects
for insert
to authenticated
with check (bucket_id = 'public-images' and owner = auth.uid());

drop policy if exists "auth update own public-images" on storage.objects;
create policy "auth update own public-images" on storage.objects
for update
to authenticated
using (bucket_id = 'public-images' and owner = auth.uid())
with check (bucket_id = 'public-images' and owner = auth.uid());

drop policy if exists "auth delete own public-images" on storage.objects;
create policy "auth delete own public-images" on storage.objects
for delete
to authenticated
using (bucket_id = 'public-images' and owner = auth.uid());

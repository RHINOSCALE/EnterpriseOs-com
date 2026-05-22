-- Create storage bucket for INDISA documents
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- RLS policies for the bucket
create policy "auth can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos');

create policy "auth can read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos');

create policy "auth can delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos');

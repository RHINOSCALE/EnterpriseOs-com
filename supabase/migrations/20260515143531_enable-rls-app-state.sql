-- Enable Row Level Security for the app state table
alter table if exists public.app_state enable row level security;

create policy "Allow select on app_state" on public.app_state
  for select
  using (auth.role() = 'anon' or auth.role() = 'authenticated');

create policy "Allow insert on app_state" on public.app_state
  for insert
  with check (auth.role() = 'anon' or auth.role() = 'authenticated');

create policy "Allow update on app_state" on public.app_state
  for update
  using (auth.role() = 'anon' or auth.role() = 'authenticated')
  with check (auth.role() = 'anon' or auth.role() = 'authenticated');

create policy "Allow delete on app_state" on public.app_state
  for delete
  using (auth.role() = 'anon' or auth.role() = 'authenticated');
-- Allow unauthenticated (anon) users to read profiles.
-- Required for login detection (returning user check) and org chart
-- before a session is established. Writes still require authentication.
drop policy if exists "Allow select on profiles" on public.profiles;

create policy "Allow select on profiles" on public.profiles
  for select using (auth.role() = 'anon' or auth.role() = 'authenticated');

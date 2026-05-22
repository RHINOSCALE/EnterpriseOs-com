-- Create profiles table for Supabase Auth-backed INDISA users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null,
  dept text,
  dept_name text,
  code text,
  avatar_color text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_profiles_role on public.profiles (role);

alter table if exists public.profiles enable row level security;

create policy "Allow select on profiles" on public.profiles
  for select
  using (auth.role() = 'authenticated');

create policy "Allow insert on profiles" on public.profiles
  for insert
  with check (auth.role() = 'authenticated');

create policy "Allow update on profiles" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Allow delete on profiles" on public.profiles
  for delete
  using (auth.uid() = id);

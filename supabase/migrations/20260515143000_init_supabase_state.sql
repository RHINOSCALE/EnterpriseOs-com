-- Create a simple app state table to persist INDISA data in Supabase.
create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_state_updated_at on public.app_state (updated_at desc);

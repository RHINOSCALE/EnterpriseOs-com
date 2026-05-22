-- Allows a logged-in user to delete their own auth account.
-- SECURITY DEFINER runs as superuser so it can delete from auth.users.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

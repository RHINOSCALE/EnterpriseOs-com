-- Fix delete_own_account: remove search_path restriction so auth schema is accessible.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

create policy "first account claims unowned store"
on public.merchants
for update
to authenticated
using (
  slug = 'mirror-atelier'
  and (owner_user_id is null or owner_user_id = (select auth.uid()))
)
with check (
  slug = 'mirror-atelier'
  and owner_user_id = (select auth.uid())
);

create or replace function public.claim_mirror_atelier()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  merchant_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  update public.merchants
  set owner_user_id = current_user_id
  where slug = 'mirror-atelier'
    and (owner_user_id is null or owner_user_id = current_user_id)
  returning id into merchant_id;

  if merchant_id is null then
    raise exception 'Mirror Atelier already belongs to another account.' using errcode = '42501';
  end if;

  return merchant_id;
end;
$$;

revoke all on function public.claim_mirror_atelier() from public;
revoke all on function public.claim_mirror_atelier() from anon;
grant execute on function public.claim_mirror_atelier() to authenticated;

-- Event-trigger functions are invoked by PostgreSQL, never through the Data API.
revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;

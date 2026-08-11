create or replace function public.claim_mirror_atelier()
returns uuid
language plpgsql
security definer
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
    and owner_user_id is null
  returning id into merchant_id;

  if merchant_id is null then
    select id into merchant_id
    from public.merchants
    where slug = 'mirror-atelier'
      and owner_user_id = current_user_id;
  end if;

  if merchant_id is null then
    raise exception 'Mirror Atelier already belongs to another account.' using errcode = '42501';
  end if;

  return merchant_id;
end;
$$;

revoke all on function public.claim_mirror_atelier() from public;
revoke all on function public.claim_mirror_atelier() from anon;
grant execute on function public.claim_mirror_atelier() to authenticated;

comment on function public.claim_mirror_atelier() is
  'Allows the first authenticated merchant account to claim the unowned MVP store.';

-- Bind every private fitting session to one authenticated account.
-- Existing sessions remain unbound and cannot be claimed by a later account;
-- clients rotate them once after this migration.
alter table public.shopper_sessions
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

create index if not exists shopper_sessions_auth_user_idx
  on public.shopper_sessions(auth_user_id, last_seen_at desc);

comment on column public.shopper_sessions.auth_user_id is
  'Authenticated owner of private shopper photos, generations, and conversations. NULL is allowed only for public analytics sessions.';

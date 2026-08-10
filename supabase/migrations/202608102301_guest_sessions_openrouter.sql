-- Replace shopper anonymous-auth dependency with server-managed guest sessions.

create table if not exists public.shopper_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  session_id text not null unique,
  session_token_hash text not null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists shopper_sessions_merchant_idx on public.shopper_sessions(merchant_id, last_seen_at desc);
alter table public.shopper_sessions enable row level security;
create policy "merchant owner reads shopper sessions" on public.shopper_sessions for select to authenticated using (exists(select 1 from public.merchants m where m.id=merchant_id and m.owner_user_id=auth.uid()));

alter table public.shopper_images add column if not exists shopper_session_id uuid references public.shopper_sessions(id) on delete cascade;
alter table public.try_on_generations add column if not exists shopper_session_id uuid references public.shopper_sessions(id) on delete cascade;
alter table public.conversations add column if not exists shopper_session_id uuid references public.shopper_sessions(id) on delete cascade;
alter table public.analytics_events add column if not exists shopper_session_id uuid references public.shopper_sessions(id) on delete set null;

update public.shopper_images set shopper_session_id = null where shopper_session_id is null;
update public.try_on_generations set shopper_session_id = null where shopper_session_id is null;
update public.conversations set shopper_session_id = null where shopper_session_id is null;

alter table public.shopper_images alter column shopper_session_id set not null;
alter table public.try_on_generations alter column shopper_session_id set not null;
alter table public.conversations alter column shopper_session_id set not null;

-- Remove policies that depend on the legacy Auth user columns before dropping them.
drop policy if exists "shoppers manage own profile" on public.shopper_profiles;
drop policy if exists "shoppers manage own image rows" on public.shopper_images;
drop policy if exists "shopper or merchant reads generation" on public.try_on_generations;
drop policy if exists "shopper or merchant reads generation products" on public.try_on_products;
drop policy if exists "shopper or merchant reads conversations" on public.conversations;
drop policy if exists "conversation participants read messages" on public.messages;

alter table public.shopper_images drop column if exists user_id;
alter table public.try_on_generations drop column if exists shopper_user_id;
alter table public.conversations drop column if exists shopper_user_id;
alter table public.analytics_events drop column if exists shopper_user_id;

create index if not exists shopper_images_session_idx on public.shopper_images(shopper_session_id, created_at desc);
create index if not exists generations_session_idx on public.try_on_generations(shopper_session_id, created_at desc);
create index if not exists conversations_session_idx on public.conversations(shopper_session_id, created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events(shopper_session_id, created_at desc);

comment on table public.shopper_sessions is 'Guest shopper sessions managed by Edge Functions; no shopper Supabase Auth required.';

create policy "merchant owner reads shopper images" on public.shopper_images for select to authenticated using (exists(select 1 from public.shopper_sessions s join public.merchants m on m.id=s.merchant_id where s.id=shopper_session_id and m.owner_user_id=auth.uid()));
create policy "merchant owner reads generations" on public.try_on_generations for select to authenticated using (exists(select 1 from public.shopper_sessions s join public.merchants m on m.id=s.merchant_id where s.id=shopper_session_id and m.owner_user_id=auth.uid()));
create policy "merchant owner reads generation products" on public.try_on_products for select to authenticated using (exists(select 1 from public.try_on_generations g join public.shopper_sessions s on s.id=g.shopper_session_id join public.merchants m on m.id=s.merchant_id where g.id=generation_id and m.owner_user_id=auth.uid()));
create policy "merchant owner reads conversations" on public.conversations for select to authenticated using (exists(select 1 from public.shopper_sessions s join public.merchants m on m.id=s.merchant_id where s.id=shopper_session_id and m.owner_user_id=auth.uid()));
create policy "merchant owner reads messages" on public.messages for select to authenticated using (exists(select 1 from public.conversations c join public.shopper_sessions s on s.id=c.shopper_session_id join public.merchants m on m.id=s.merchant_id where c.id=conversation_id and m.owner_user_id=auth.uid()));

drop policy if exists "shopper uploads own source images" on storage.objects;
drop policy if exists "shopper reads own source images" on storage.objects;
drop policy if exists "shopper deletes own source images" on storage.objects;
drop policy if exists "shopper reads own tryon results" on storage.objects;

-- Source/result files are now written and read only via Edge Functions using service role and signed URLs.

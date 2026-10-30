-- Run through the Supabase SQL editor or `supabase db push`.
-- This table intentionally stores only aggregate preference weights, never titles,
-- raw watch events, provider credentials, or stream information.

create table if not exists public.argus_taste_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version smallint not null default 1 check (version = 1),
  taste jsonb not null default '{"version":1,"genres":{},"decades":{},"languages":{}}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint argus_taste_profiles_size check (pg_column_size(taste) <= 16384)
);

alter table public.argus_taste_profiles enable row level security;

create policy "Users read their own taste profile"
  on public.argus_taste_profiles for select
  using ((select auth.uid()) = user_id);

create policy "Users create their own taste profile"
  on public.argus_taste_profiles for insert
  with check ((select auth.uid()) = user_id);

create policy "Users update their own taste profile"
  on public.argus_taste_profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.argus_touch_taste_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists argus_taste_profiles_updated_at on public.argus_taste_profiles;
create trigger argus_taste_profiles_updated_at
  before update on public.argus_taste_profiles
  for each row execute procedure public.argus_touch_taste_profile();

-- Opt-in media sync for native Android. Separate from private aggregate taste.
-- Additive and repeatable: existing desktop data and taste policies are unchanged.
begin;
create table if not exists public.argus_media_sync (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) between 1 and 8192),
  kind text not null check (kind in ('library', 'history', 'addon')),
  value jsonb not null check (jsonb_typeof(value) = 'object' and pg_column_size(value) <= 65536),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.argus_media_sync enable row level security;
revoke all on public.argus_media_sync from anon;
grant select, insert, update on public.argus_media_sync to authenticated;
drop policy if exists "Account reads own media" on public.argus_media_sync;
create policy "Account reads own media" on public.argus_media_sync for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Account creates own media" on public.argus_media_sync;
create policy "Account creates own media" on public.argus_media_sync for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Account updates own media" on public.argus_media_sync;
create policy "Account updates own media" on public.argus_media_sync for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create or replace function public.argus_touch_media_sync() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists argus_media_sync_updated on public.argus_media_sync;
create trigger argus_media_sync_updated before update on public.argus_media_sync
  for each row execute function public.argus_touch_media_sync();
commit;

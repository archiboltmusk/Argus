-- Additive Argus Account Suite: encrypted vault, devices, handoff, snapshots, and TV/projector pairing.
begin;

alter table public.argus_media_sync
  drop constraint if exists argus_media_sync_kind_check;

alter table public.argus_media_sync
  add constraint argus_media_sync_kind_check
  check (kind in ('library', 'history', 'addon', 'vault', 'device', 'handoff', 'profile', 'snapshot'));

create table if not exists public.argus_pairing_codes (
  code text primary key check (length(code) = 6),
  device_name text not null,
  device_type text not null default 'projector',
  approved_user_id uuid references auth.users(id) on delete cascade,
  payload_enc text,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

alter table public.argus_pairing_codes enable row level security;
revoke all on public.argus_pairing_codes from anon;
grant select, insert, update, delete on public.argus_pairing_codes to authenticated;

drop policy if exists "Authenticated creates pairing code" on public.argus_pairing_codes;
create policy "Authenticated creates pairing code" on public.argus_pairing_codes
  for insert to authenticated with check (true);

drop policy if exists "Authenticated reads pairing code" on public.argus_pairing_codes;
create policy "Authenticated reads pairing code" on public.argus_pairing_codes
  for select to authenticated using (expires_at > now());

drop policy if exists "Authenticated approves pairing code" on public.argus_pairing_codes;
create policy "Authenticated approves pairing code" on public.argus_pairing_codes
  for update to authenticated using (expires_at > now());

commit;

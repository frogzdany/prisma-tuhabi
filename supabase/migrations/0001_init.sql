-- Aftercall PoC schema
-- Forward-only. No rollback. Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.deal_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  deal_id text not null,
  company_name text not null,
  company_domain text,
  champion_name text not null,
  champion_email text,
  seller_name text not null,
  seller_company text not null,
  payload jsonb not null,
  voice_audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deal_rooms_slug_idx on public.deal_rooms (slug);

create table if not exists public.room_events (
  id bigserial primary key,
  deal_slug text not null references public.deal_rooms (slug) on delete cascade,
  stakeholder_email text,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists room_events_deal_slug_idx on public.room_events (deal_slug);
create index if not exists room_events_created_at_idx on public.room_events (created_at desc);

-- Realtime: publish room_events so the Slack notifier can subscribe.
alter publication supabase_realtime add table public.room_events;

-- RLS (open for PoC; lock down for prod).
alter table public.deal_rooms enable row level security;
alter table public.room_events enable row level security;

drop policy if exists "anon read deal_rooms" on public.deal_rooms;
create policy "anon read deal_rooms" on public.deal_rooms
  for select using (true);

drop policy if exists "anon insert room_events" on public.room_events;
create policy "anon insert room_events" on public.room_events
  for insert with check (true);

-- Storage bucket for ElevenLabs voice MP3s.
insert into storage.buckets (id, name, public)
values ('voice-intros', 'voice-intros', true)
on conflict (id) do nothing;

drop policy if exists "voice intros public read" on storage.objects;
create policy "voice intros public read" on storage.objects
  for select using (bucket_id = 'voice-intros');

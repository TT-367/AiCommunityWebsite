create table if not exists public.client_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  level text not null,
  kind text not null,
  message text,
  name text,
  stack text,
  url text,
  release text,
  environment text,
  user_id uuid,
  session_id text,
  request_id text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_client_events_occurred_at on public.client_events (occurred_at desc);
create index if not exists idx_client_events_level on public.client_events (level);

alter table public.client_events enable row level security;

drop policy if exists "client_events_insert" on public.client_events;
create policy "client_events_insert" on public.client_events
for insert
to public
with check (true);


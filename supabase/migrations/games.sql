create table if not exists public.games (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text not null,
  thumbnail_url text,
  tags text[] not null default '{}',
  play_count bigint not null default 0,
  likes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_games_created_at on public.games(created_at desc);
create index if not exists idx_games_owner_id on public.games(owner_id);

drop trigger if exists trg_games_set_updated_at on public.games;
create trigger trg_games_set_updated_at
before update on public.games
for each row
execute function public.set_updated_at();

alter table public.games enable row level security;

drop policy if exists "games_select" on public.games;
create policy "games_select" on public.games
for select
to public
using (true);

drop policy if exists "games_insert" on public.games;
create policy "games_insert" on public.games
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "games_update_own" on public.games;
create policy "games_update_own" on public.games
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "games_delete_own" on public.games;
create policy "games_delete_own" on public.games
for delete
to authenticated
using (owner_id = auth.uid());

grant select on public.games to anon;
grant all privileges on public.games to authenticated;


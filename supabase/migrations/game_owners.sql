create table if not exists public.game_owners (
  game_id text primary key,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_owners_owner_id on public.game_owners(owner_id);

alter table public.game_owners enable row level security;

drop policy if exists "game_owners_select" on public.game_owners;
create policy "game_owners_select" on public.game_owners
for select
to public
using (true);

drop policy if exists "game_posts_insert" on public.game_posts;
create policy "game_posts_insert" on public.game_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.game_owners go
    where go.game_id = game_posts.game_id
      and go.owner_id = auth.uid()
  )
);

drop policy if exists "game_posts_update_own" on public.game_posts;
create policy "game_posts_update_own" on public.game_posts
for update
to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1
    from public.game_owners go
    where go.game_id = game_posts.game_id
      and go.owner_id = auth.uid()
  )
)
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.game_owners go
    where go.game_id = game_posts.game_id
      and go.owner_id = auth.uid()
  )
);

drop policy if exists "game_posts_delete_own" on public.game_posts;
create policy "game_posts_delete_own" on public.game_posts
for delete
to authenticated
using (
  author_id = auth.uid()
  and exists (
    select 1
    from public.game_owners go
    where go.game_id = game_posts.game_id
      and go.owner_id = auth.uid()
  )
);

grant select on public.game_owners to anon;
grant select on public.game_owners to authenticated;


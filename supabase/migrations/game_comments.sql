create table if not exists public.game_comments (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  parent_id uuid references public.game_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_comments_game_id_created_at on public.game_comments(game_id, created_at asc);
create index if not exists idx_game_comments_parent_id on public.game_comments(parent_id);

alter table public.game_comments enable row level security;

drop policy if exists "game_comments_select" on public.game_comments;
create policy "game_comments_select" on public.game_comments
for select
to public
using (true);

drop policy if exists "game_comments_insert" on public.game_comments;
create policy "game_comments_insert" on public.game_comments
for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "game_comments_delete_own" on public.game_comments;
create policy "game_comments_delete_own" on public.game_comments
for delete
to authenticated
using (author_id = auth.uid());

grant select on public.game_comments to anon;
grant all privileges on public.game_comments to authenticated;

create table if not exists public.game_comment_likes (
  comment_id uuid not null references public.game_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists idx_game_comment_likes_user_id on public.game_comment_likes(user_id);

alter table public.game_comment_likes enable row level security;

drop policy if exists "game_comment_likes_select" on public.game_comment_likes;
create policy "game_comment_likes_select" on public.game_comment_likes
for select
to public
using (true);

drop policy if exists "game_comment_likes_insert" on public.game_comment_likes;
create policy "game_comment_likes_insert" on public.game_comment_likes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "game_comment_likes_delete_own" on public.game_comment_likes;
create policy "game_comment_likes_delete_own" on public.game_comment_likes
for delete
to authenticated
using (user_id = auth.uid());

grant select on public.game_comment_likes to anon;
grant all privileges on public.game_comment_likes to authenticated;


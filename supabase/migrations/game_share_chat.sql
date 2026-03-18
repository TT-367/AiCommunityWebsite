create table if not exists public.game_posts (
  game_id text primary key,
  author_id uuid not null references public.profiles(id) on delete restrict,
  author_note text not null,
  video_url text,
  repo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_posts_created_at on public.game_posts(created_at desc);

drop trigger if exists trg_game_posts_set_updated_at on public.game_posts;
create trigger trg_game_posts_set_updated_at
before update on public.game_posts
for each row
execute function public.set_updated_at();

create table if not exists public.game_chat_messages (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  parent_id uuid references public.game_chat_messages(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_chat_messages_game_created_at on public.game_chat_messages(game_id, created_at);
create index if not exists idx_game_chat_messages_game_parent on public.game_chat_messages(game_id, parent_id);

alter table public.game_posts enable row level security;
alter table public.game_chat_messages enable row level security;

drop policy if exists "game_posts_select" on public.game_posts;
create policy "game_posts_select" on public.game_posts
for select
to public
using (true);

drop policy if exists "game_posts_insert" on public.game_posts;
create policy "game_posts_insert" on public.game_posts
for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "game_posts_update_own" on public.game_posts;
create policy "game_posts_update_own" on public.game_posts
for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "game_posts_delete_own" on public.game_posts;
create policy "game_posts_delete_own" on public.game_posts
for delete
to authenticated
using (author_id = auth.uid());

drop policy if exists "game_chat_messages_select" on public.game_chat_messages;
create policy "game_chat_messages_select" on public.game_chat_messages
for select
to public
using (true);

drop policy if exists "game_chat_messages_insert" on public.game_chat_messages;
create policy "game_chat_messages_insert" on public.game_chat_messages
for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "game_chat_messages_update_own" on public.game_chat_messages;
create policy "game_chat_messages_update_own" on public.game_chat_messages
for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

drop policy if exists "game_chat_messages_delete_own" on public.game_chat_messages;
create policy "game_chat_messages_delete_own" on public.game_chat_messages
for delete
to authenticated
using (sender_id = auth.uid());

grant select on public.game_posts to anon;
grant all privileges on public.game_posts to authenticated;

grant select on public.game_chat_messages to anon;
grant all privileges on public.game_chat_messages to authenticated;


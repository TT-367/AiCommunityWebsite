alter table public.posts
add column if not exists linked_skill_id text,
add column if not exists linked_game_id text;

create index if not exists idx_posts_linked_skill_id on public.posts(linked_skill_id);
create index if not exists idx_posts_linked_game_id on public.posts(linked_game_id);


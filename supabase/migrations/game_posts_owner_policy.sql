drop policy if exists "game_posts_insert" on public.game_posts;
create policy "game_posts_insert" on public.game_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.games g
    where g.id = game_posts.game_id
      and g.owner_id = auth.uid()
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
    from public.games g
    where g.id = game_posts.game_id
      and g.owner_id = auth.uid()
  )
)
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.games g
    where g.id = game_posts.game_id
      and g.owner_id = auth.uid()
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
    from public.games g
    where g.id = game_posts.game_id
      and g.owner_id = auth.uid()
  )
);


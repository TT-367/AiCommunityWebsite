alter table public.comments
add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists idx_comments_post_parent on public.comments(post_id, parent_id);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.post_reports (
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

alter table public.comment_likes enable row level security;
alter table public.post_reports enable row level security;

drop policy if exists "comment_likes_select" on public.comment_likes;
create policy "comment_likes_select" on public.comment_likes
for select
to public
using (true);

drop policy if exists "comment_likes_insert" on public.comment_likes;
create policy "comment_likes_insert" on public.comment_likes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_delete_own" on public.comment_likes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "post_reports_insert" on public.post_reports;
create policy "post_reports_insert" on public.post_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "post_reports_select_own" on public.post_reports;
create policy "post_reports_select_own" on public.post_reports
for select
to authenticated
using (reporter_id = auth.uid());


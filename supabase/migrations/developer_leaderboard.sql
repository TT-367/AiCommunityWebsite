create or replace function public.get_developer_leaderboard(limit_count int default 10)
returns table (
  author_id uuid,
  display_name text,
  avatar_url text,
  total_likes bigint,
  total_posts bigint,
  top_post_id uuid,
  top_post_title text,
  top_post_description text,
  top_post_likes bigint
)
language sql
stable
as $$
  with post_like_counts as (
    select
      p.id as post_id,
      p.author_id,
      p.title,
      p.description,
      p.created_at,
      count(pl.user_id) as likes
    from public.posts p
    left join public.post_likes pl on pl.post_id = p.id
    group by p.id, p.author_id, p.title, p.description, p.created_at
  ),
  author_agg as (
    select
      author_id,
      sum(likes)::bigint as total_likes,
      count(*)::bigint as total_posts
    from post_like_counts
    group by author_id
  ),
  ranked_posts as (
    select
      *,
      row_number() over (partition by author_id order by likes desc, created_at desc) as rn
    from post_like_counts
  )
  select
    a.author_id,
    coalesce(pr.display_name, concat('User ', substring(a.author_id::text, 1, 4))) as display_name,
    pr.avatar_url,
    a.total_likes,
    a.total_posts,
    rp.post_id as top_post_id,
    rp.title as top_post_title,
    rp.description as top_post_description,
    rp.likes as top_post_likes
  from author_agg a
  left join public.profiles pr on pr.id = a.author_id
  left join ranked_posts rp on rp.author_id = a.author_id and rp.rn = 1
  order by a.total_likes desc nulls last, a.total_posts desc
  limit limit_count;
$$;

grant execute on function public.get_developer_leaderboard(int) to anon;
grant execute on function public.get_developer_leaderboard(int) to authenticated;

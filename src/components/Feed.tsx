import { useEffect, useMemo, useState } from 'react';
import { PostCard } from './PostCard';
import { mockPosts } from '../data/mock';
import { getLocalPosts } from '../data/localPostsStore';
import { FORCE_MOCK_POSTS } from '../config/featureFlags';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { canonicalizeTag, canonicalizeTags, normalizeTagAlias } from '../lib/tags';

type PostSummary = {
  id: string;
  author: { id: string; name: string; handle: string; avatar: string };
  title: string;
  description: string;
  tags: string[];
  likes: number;
  commentsCount: number;
  createdAt: string;
  viewerHasLiked?: boolean;
  isAiAssisted?: boolean;
};

type FeedMode = 'hot' | 'latest';

interface FeedProps {
  mode?: FeedMode;
  tags?: string[];
  keyword?: string;
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type CountRow = { count: number };

type PostRow = {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  is_ai_assisted: boolean;
  created_at: string;
  author: ProfileRow | null;
  comments: CountRow[];
  post_likes: CountRow[];
};

type PostLikeRow = { post_id: string };

export function Feed({ mode = 'latest', tags = [], keyword = '' }: FeedProps) {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const fallbackPosts = useMemo<PostSummary[]>(
    () =>
      [...getLocalPosts(), ...mockPosts].map(p => ({
        id: p.id,
        author: p.author,
        title: p.title,
        description: p.description,
        tags: p.tags,
        likes: p.likes,
        commentsCount: p.commentsCount,
        createdAt: p.createdAt,
        viewerHasLiked: false,
        isAiAssisted: p.isAiAssisted,
      })),
    []
  );

  const mapPostRow = (row: PostRow): PostSummary => {
    const authorId = row.author?.id ?? '';
    const displayName = row.author?.display_name ?? `User ${String(authorId).slice(0, 4)}`;
    const avatar = row.author?.avatar_url
      ? String(row.author.avatar_url)
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId || row.id}`;

    const likesCount = row.post_likes?.[0]?.count ?? 0;
    const commentsCount = row.comments?.[0]?.count ?? 0;

    return {
      id: row.id,
      author: {
        id: authorId,
        name: String(displayName),
        handle: `@${String(authorId).slice(0, 6)}`,
        avatar,
      },
      title: String(row.title),
      description: String(row.description ?? ''),
      tags: (row.tags ?? []) as string[],
      likes: Number(likesCount),
      commentsCount: Number(commentsCount),
      createdAt: String(row.created_at),
      viewerHasLiked: false,
      isAiAssisted: Boolean(row.is_ai_assisted),
    };
  };

  useEffect(() => {
    const onRefresh = () => setRefreshTick(t => t + 1);
    window.addEventListener('posts:refresh', onRefresh);
    return () => {
      window.removeEventListener('posts:refresh', onRefresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      if (cancelled) return;
      if (FORCE_MOCK_POSTS) {
        const merged = [...getLocalPosts(), ...mockPosts]
          .map<PostSummary>((p) => ({
          id: p.id,
          author: p.author,
          title: p.title,
          description: p.description,
          tags: p.tags,
          likes: p.likes,
          commentsCount: p.commentsCount,
          createdAt: p.createdAt,
          viewerHasLiked: false,
          isAiAssisted: p.isAiAssisted,
        }));
        setPosts(merged);
      } else {
        let q = supabase
          .from('posts')
          .select(
            'id,title,description,tags,is_ai_assisted,created_at,author:profiles!posts_author_id_fkey(id,display_name,avatar_url),comments(count),post_likes(count)'
          )
          .order('created_at', { ascending: false })
          .limit(50);
        if (tags.length > 0) q = q.overlaps('tags', tags);
        const { data, error } = await q;

        if (cancelled) return;
        if (error || !data) {
          setPosts([]);
          setLoading(false);
          return;
        }

        const mapped: PostSummary[] = (data as unknown as PostRow[]).map(mapPostRow);
        if (user && mapped.length > 0) {
          const { data: likedRows } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in(
              'post_id',
              mapped.map(p => p.id)
            );

          const likedSet = new Set((likedRows as PostLikeRow[] | null | undefined ?? []).map((r) => r.post_id));
          for (const p of mapped) p.viewerHasLiked = likedSet.has(p.id);
        }
        setPosts(mapped);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTick, tags, user]);

  const displayPosts = useMemo(() => {
    const kw = (keyword ?? '').trim();
    const tokens = kw.length === 0 ? [] : kw.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    
    // 如果没有真实数据，使用 fallback 数据进行过滤
    const sourcePosts = (posts.length === 0 && !loading) ? fallbackPosts : posts;

    const base = sourcePosts.filter((p) => {
      if (tags.length === 0 && kw.length === 0) return true;
      const slugs = canonicalizeTags(p.tags ?? []);
      const overlap = tags.length > 0 ? slugs.some((t) => tags.includes(t)) : false;
      const text = `${p.title} ${p.description}`.toLowerCase();
      const kwHit =
        tokens.length === 0
          ? false
          : tokens.every((tok) => {
              const tl = tok.toLowerCase();
              const slug = canonicalizeTag(tok);
              const normTok = normalizeTagAlias(tl);
              const normTokValid = normTok.length > 0;
              const textHit = text.includes(tl) || (normTokValid ? normalizeTagAlias(text).includes(normTok) : false);
              const tagHit = slug ? slugs.includes(slug) : false;
              return textHit || tagHit;
            });
      return overlap || kwHit;
    });
    if (mode === 'hot') return [...base].sort((a, b) => b.likes - a.likes);
    return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [keyword, mode, posts, tags, fallbackPosts, loading]);

  const hotIdSet = useMemo(() => {
    const top = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 5);
    return new Set(top.map(p => p.id));
  }, [posts]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {loading ? (
          // 可以添加 Skeleton
          null
        ) : displayPosts.length > 0 ? (
          displayPosts.map((post) => (
            <PostCard key={post.id} post={post} isHot={hotIdSet.has(post.id)} />
          ))
        ) : (
          <div className="text-center py-20 bg-surface rounded-xl border border-dashed border-border">
            <div className="text-muted-foreground font-medium">未找到相关内容</div>
            <div className="text-xs text-muted-foreground/60 mt-1">尝试更换关键词或标签</div>
          </div>
        )}
      </div>
    </div>
  );
}

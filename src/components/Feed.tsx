import { useEffect, useMemo, useState } from 'react';
import { PostCard } from './PostCard';
import { mockPosts } from '../data/mock';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';

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

export function Feed({ mode = 'latest' }: FeedProps) {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const fallbackPosts = useMemo<PostSummary[]>(
    () =>
      mockPosts.map(p => ({
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
      setLoadError(null);
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id,title,description,tags,is_ai_assisted,created_at,author:profiles(id,display_name,avatar_url),comments(count),post_likes(count)'
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error || !data) {
        if (error) setLoadError(error.message);
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
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTick, user]);

  const displayPosts = useMemo(() => {
    const base = posts;
    if (mode === 'hot') return [...base].sort((a, b) => b.likes - a.likes);
    return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [mode, posts]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {(loading ? [] : displayPosts).map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {!loading && posts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-gray-500">
            暂无真实帖子数据。你可以登录后发布第一篇帖子。
            {loadError && <div className="mt-2 text-xs text-red-600">加载失败：{loadError}</div>}
            <div className="mt-3 text-xs text-gray-400">下面为示例内容（mock）。</div>
          </div>
        )}
        {!loading && posts.length === 0 && fallbackPosts.map((post) => (
          <PostCard key={`mock-${post.id}`} post={post} />
        ))}
      </div>
    </div>
  );
}

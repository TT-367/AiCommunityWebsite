import { useEffect, useMemo, useState } from 'react';
import { PostCard } from './PostCard';
import { mockPosts } from '../data/mock';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui/Button';

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

export function Feed() {
  const { user, openModal } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostSummary[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id,title,description,tags,is_ai_assisted,created_at,author:profiles(id,display_name,avatar_url),comments(count),post_likes(count)'
        )
        .order('created_at', { ascending: false })
        .limit(50);

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
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-900">发布新帖子</div>
          {!user && (
            <Button variant="secondary" size="sm" onClick={() => openModal('signIn')}>
              登录后发布
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            placeholder="标题"
            disabled={!user || submitting}
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full min-h-[96px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            placeholder="正文（支持 Markdown）"
            disabled={!user || submitting}
          />
          <input
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            placeholder="标签（可选，逗号分隔，如：RAG,vLLM）"
            disabled={!user || submitting}
          />

          {submitError && <div className="text-sm text-red-600">{submitError}</div>}

          <div className="flex justify-end">
            <Button
              disabled={!user || submitting || newTitle.trim().length === 0 || newContent.trim().length === 0}
              onClick={async () => {
                if (!user) {
                  openModal('signIn');
                  return;
                }

                setSubmitting(true);
                setSubmitError(null);
                try {
                  const tags = newTags
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                    .slice(0, 8);

                  const description = newContent.replace(/\s+/g, ' ').trim().slice(0, 160);
                  const { error } = await supabase.from('posts').insert({
                    author_id: user.id,
                    title: newTitle.trim(),
                    content: newContent,
                    description,
                    tags,
                  });
                  if (error) throw error;

                  setNewTitle('');
                  setNewContent('');
                  setNewTags('');

                  const { data } = await supabase
                    .from('posts')
                    .select(
                      'id,title,description,tags,is_ai_assisted,created_at,author:profiles(id,display_name,avatar_url),comments(count),post_likes(count)'
                    )
                    .order('created_at', { ascending: false })
                    .limit(50);

                  const mapped: PostSummary[] = ((data ?? []) as unknown as PostRow[]).map(mapPostRow);

                  setPosts(mapped);
                } catch (err) {
                  const message = err instanceof Error ? err.message : '发布失败';
                  setSubmitError(message);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              发布
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {(loading ? [] : posts).map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {!loading && posts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-gray-500">
            暂无真实帖子数据。你可以登录后发布第一篇帖子。
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

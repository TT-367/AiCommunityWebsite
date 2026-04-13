import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Gamepad2, Heart } from 'lucide-react';
import { mockGames, mockPosts } from '../data/mock';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabaseClient';

type CountRow = { count: number };
type RemotePostRow = { id: string; title: string; description: string | null; created_at: string; post_likes: CountRow[] };

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const authorId = id ?? '';

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [remotePosts, setRemotePosts] = useState<Array<{ id: string; title: string; description: string | null; created_at: string; likes: number }>>([]);

  const localPosts = useMemo(() => mockPosts.filter(p => p.author.id === authorId).sort((a, b) => b.likes - a.likes), [authorId]);
  const games = useMemo(() => mockGames.filter(g => g.author.id === authorId).sort((a, b) => b.likes - a.likes), [authorId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id,display_name,avatar_url')
        .eq('id', authorId)
        .maybeSingle();

      if (cancelled) return;
      setProfile(profileData ?? null);

      const { data: postsData } = await supabase
        .from('posts')
        .select('id,title,description,created_at,post_likes(count)')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;
      const mapped = ((postsData ?? []) as unknown as RemotePostRow[]).map((row) => ({
        id: row.id,
        title: String(row.title),
        description: row.description ? String(row.description) : null,
        created_at: String(row.created_at),
        likes: row.post_likes?.[0]?.count ?? 0,
      }));
      setRemotePosts(mapped);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authorId]);

  const author = useMemo(() => {
    if (profile) {
      const name = profile.display_name ?? `User ${authorId.slice(0, 4)}`;
      const avatar = profile.avatar_url ? profile.avatar_url : `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`;
      return { id: authorId, name, handle: `@${authorId.slice(0, 6)}`, avatar };
    }
    return localPosts[0]?.author ?? games[0]?.author;
  }, [authorId, games, localPosts, profile]);

  const totalLikes = useMemo(() => {
    const remoteLikes = remotePosts.reduce((sum, p) => sum + p.likes, 0);
    const localLikes = localPosts.reduce((sum, p) => sum + p.likes, 0);
    const gameLikes = games.reduce((sum, g) => sum + g.likes, 0);
    return remoteLikes + localLikes + gameLikes;
  }, [games, localPosts, remotePosts]);

  const postsCount = remotePosts.length > 0 ? remotePosts.length : localPosts.length;

  if (!author) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-12 text-center max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground">User not found</h2>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-background/90 supports-[backdrop-filter]:bg-background/70 backdrop-blur border-b border-border">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </div>

        <div className="mt-6 bg-surface rounded-xl border border-border shadow-e1 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar src={author.avatar} alt={author.name} size="lg" />
                <div className="min-w-0">
                  <div className="text-xl font-bold text-foreground truncate">{author.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{author.handle}</div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span className="font-semibold text-foreground">{totalLikes.toLocaleString()}</span>
                      <span className="text-muted-foreground">获赞</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span className="font-semibold text-foreground">{postsCount}</span>
                      <span className="text-muted-foreground">发帖</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gamepad2 className="w-4 h-4" />
                      <span className="font-semibold text-foreground">{games.length}</span>
                      <span className="text-muted-foreground">游戏</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="flex-shrink-0" variant="secondary">
                Follow
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-border shadow-e1 overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="font-bold text-foreground">帖子</div>
              <div className="text-xs text-muted-foreground mt-1">按点赞排序</div>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-5 py-6 text-sm text-muted-foreground/70">加载中...</div>
              ) : remotePosts.length > 0 ? (
                remotePosts.slice(0, 10).map(p => (
                  <Link key={p.id} to={`/post/${p.id}`} className="block px-5 py-3 hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description ?? ''}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">👍 {p.likes.toLocaleString()}</div>
                    </div>
                  </Link>
                ))
              ) : localPosts.length > 0 ? (
                localPosts.slice(0, 10).map(p => (
                  <Link key={p.id} to={`/post/${p.id}`} className="block px-5 py-3 hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">👍 {p.likes.toLocaleString()}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-muted-foreground/70">暂无帖子</div>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border shadow-e1 overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="font-bold text-foreground">游戏项目</div>
              <div className="text-xs text-muted-foreground mt-1">按点赞排序</div>
            </div>
            <div className="divide-y divide-border">
              {games.length > 0 ? (
                games.slice(0, 10).map(g => (
                  <Link key={g.id} to={`/games/${g.id}`} className="block px-5 py-3 hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground line-clamp-1">{g.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{g.description}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">👍 {g.likes.toLocaleString()}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-muted-foreground/70">暂无游戏</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
